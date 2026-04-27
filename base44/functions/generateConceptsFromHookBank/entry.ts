import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

// Fast mode constants
const HOOK_CONCEPT_GENERATION_COUNT = 10;
const HOOK_TEMPLATE_RETRIEVAL_LIMIT = 30;
const FINAL_CONCEPT_COUNT = 4;

const STRATEGY_MODEL = Deno.env.get("OPENAI_STRATEGY_MODEL") || "gpt-4o";
const FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || "gpt-4o-mini";

// Map video styles to concept hook categories
const STYLE_TO_CATEGORY = {
  "תדמית": ["authority", "storytelling", "day_in_life"],
  "סרטון אווירה": ["storytelling", "day_in_life", "other"],
  "סרטון הכרות": ["storytelling", "day_in_life", "random"],
  "מכירתי": ["comparison", "myth_busting", "authority"],
  "כאב / פתרון": ["educational", "myth_busting", "comparison"],
  "אדם מדבר למצלמה": ["educational", "storytelling", "authority"],
  "חינוכי": ["educational", "myth_busting", "comparison"],
  "השוואה": ["comparison", "educational"],
  "מיתוס / ניפוץ": ["myth_busting", "educational"],
  "הוכחה / סמכות": ["authority", "storytelling"],
  "יום בחיי": ["day_in_life", "storytelling", "random"],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const body = await req.json();
    const { project_id, client_name, main_goal, raw_notes, industry, creative_dna, selected_video_style, existing_categories } = body;

    // Verify project ownership
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    const project = projects[0];
    if (!project || (project.owner_id && project.owner_id !== user.id)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create generation run record
    const generationRun = await base44.asServiceRole.entities.HookDrivenGenerationRuns.create({
      project_id,
      user_id: user.id,
      selected_video_style,
      industry: industry || "general",
      business_name: client_name,
      status: "running",
      prompt_version: "hook_driven_concepts_v2_fast",
    });

    // Load relevant hook templates — max 30
    const preferredCategories = STYLE_TO_CATEGORY[selected_video_style] || ["educational", "storytelling", "random"];
    const allTemplates = await base44.asServiceRole.entities.LockedHookTemplates.filter({ is_active: true });

    // Prioritize templates matching preferred categories, then fill up to limit
    const preferred = allTemplates.filter(t => preferredCategories.includes(t.source_category) && t.concept_generation_fit !== false);
    const others = allTemplates.filter(t => !preferredCategories.includes(t.source_category) && t.concept_generation_fit !== false);
    const selectedTemplates = [...preferred, ...others].slice(0, HOOK_TEMPLATE_RETRIEVAL_LIMIT);

    if (selectedTemplates.length === 0) {
      await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, { status: "failed" });
      return Response.json({ error: "No hook templates found" }, { status: 500 });
    }

    await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, {
      total_templates_loaded: selectedTemplates.length,
    });

    const templateList = selectedTemplates.map((t, i) =>
      `[${i + 1}] ID:${t.id} | "${t.hebrew_template}" | mechanic: ${t.hook_mechanic || ""}`
    ).join("\n");

    // STEP 1: Generate 10 raw concepts in one call
    const conceptPrompt = `You are Briefi, an Israeli short-form video creative director.

Business: ${client_name}
Goal: ${main_goal || ""}
Industry: ${industry || "general"}
Notes: ${raw_notes || ""}
Creative DNA: ${JSON.stringify(creative_dna || {})}
Video style: ${selected_video_style}
Already used categories: ${(existing_categories || []).join(", ") || "none"}

Available hook templates (pick one per concept, use its ID):
${templateList}

Generate exactly ${HOOK_CONCEPT_GENERATION_COUNT} video concepts. For each:
1. Pick the most fitting hook template from the list above.
2. Fill in the template placeholders with real business-specific details.
3. Write a short 2-3 sentence scene description (who, where, what action, tension).
4. Never use: "סרטון שמציג", "נציג את", "נראה את", "חוויה", "אווירה".
5. Each concept must be specific, shootable tomorrow, include a real person doing something.
6. Vary the approaches across the 10 concepts.

Return ONLY valid JSON:
{
  "raw_concepts": [
    {
      "concept_title": "max 5 Hebrew words",
      "short_description": "2-3 sentences — scene-based, specific, shootable",
      "hook": "the filled-in hook text in natural Hebrew — max 12 words",
      "source_hook_template_id": "the ID from the list",
      "idea_tags": ["מצחיק", "ישראלי"],
      "why_it_works": "1 sentence practical reason"
    }
  ]
}`;

    const conceptResponse = await openai.chat.completions.create({
      model: STRATEGY_MODEL,
      temperature: 0.8,
      max_completion_tokens: 3000,
      messages: [{ role: "user", content: conceptPrompt }],
      response_format: { type: "json_object" },
    });

    const rawResult = JSON.parse(conceptResponse.choices[0].message.content);
    const rawConcepts = rawResult.raw_concepts || [];

    await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, {
      total_raw_concepts_generated: rawConcepts.length,
    });

    // STEP 2: Score all concepts in one call
    const scorePrompt = `You are a strict Israeli video concept quality scorer.

Score each of these ${rawConcepts.length} video concepts. Return only scores.

Video style: ${selected_video_style}
Business: ${client_name}
Goal: ${main_goal || ""}

Concepts:
${rawConcepts.map((c, i) => `[${i}] "${c.concept_title}" | Hook: "${c.hook}" | Desc: "${c.short_description}"`).join("\n")}

For each concept, score 0-100 (overall quality). Reject (score < 60) if:
- Hook is vague or longer than 12 words
- Description is generic ("אווירה", "מגוון", "חוויה")
- No real person/action/tension
- Could fit any business

Return valid JSON:
{
  "scores": [
    { "index": 0, "score": 85, "keep": true },
    { "index": 1, "score": 45, "keep": false }
  ]
}`;

    const scoreResponse = await openai.chat.completions.create({
      model: FAST_MODEL,
      temperature: 0.2,
      max_completion_tokens: 800,
      messages: [{ role: "user", content: scorePrompt }],
      response_format: { type: "json_object" },
    });

    const scoreResult = JSON.parse(scoreResponse.choices[0].message.content);
    const scores = scoreResult.scores || [];

    // Keep concepts that pass (score >= 60), sorted by score desc
    const scoredConcepts = rawConcepts.map((c, i) => {
      const s = scores.find(x => x.index === i) || { score: 50, keep: true };
      return { ...c, _score: s.score, _keep: s.keep !== false && s.score >= 60 };
    }).sort((a, b) => b._score - a._score);

    let finalConcepts = scoredConcepts.filter(c => c._keep).slice(0, FINAL_CONCEPT_COUNT);

    // If fewer than 4 passed, fill with best remaining
    if (finalConcepts.length < FINAL_CONCEPT_COUNT) {
      const remaining = scoredConcepts.filter(c => !c._keep);
      finalConcepts = [...finalConcepts, ...remaining].slice(0, FINAL_CONCEPT_COUNT);
    }

    // Save candidates to DB
    for (const c of finalConcepts) {
      await base44.asServiceRole.entities.HookDrivenConceptCandidates.create({
        generation_run_id: generationRun.id,
        project_id,
        concept_title: c.concept_title,
        short_description: c.short_description,
        filled_hook: c.hook,
        source_hook_template_id: c.source_hook_template_id,
        idea_tags: c.idea_tags || [],
        why_it_works: c.why_it_works,
        high_energy_score: c._score,
        status: "selected",
      });
    }

    await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, {
      total_final_concepts: finalConcepts.length,
      total_concepts_rejected: scoredConcepts.filter(c => !c._keep).length,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // Return clean output for frontend
    const output = finalConcepts.map(c => ({
      concept_title: c.concept_title,
      short_description: c.short_description,
      filled_hook: c.hook,
      source_hook_template_id: c.source_hook_template_id,
      idea_tags: c.idea_tags || [],
      why_it_works: c.why_it_works,
      full_concept_data: {},
    }));

    return Response.json({
      concepts: output,
      generation_run_id: generationRun.id,
      _debug: {
        templates_loaded: selectedTemplates.length,
        raw_concepts_generated: rawConcepts.length,
        concepts_passed_scoring: scoredConcepts.filter(c => c._keep).length,
        final_count: finalConcepts.length,
      },
    });

  } catch (error) {
    console.error("generateConceptsFromHookBank error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});