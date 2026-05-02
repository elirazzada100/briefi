import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

// Fast mode constants
const HOOK_CONCEPT_GENERATION_COUNT = 10;
const HOOK_TEMPLATE_RETRIEVAL_LIMIT = 30;
const FINAL_CONCEPT_COUNT = 4;

const STRATEGY_MODEL = Deno.env.get("OPENAI_STRATEGY_MODEL") || "gpt-4o";
const FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || "gpt-4o-mini";

// Map video styles to preferred hook source categories
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

const SYSTEM_PROMPT = `You are Briefi Creative Agent.

You generate practical Israeli short-form video concepts for small businesses.

For this generation mode:
The user does not choose hooks.
You receive real hook templates from LockedHookTemplates.
Every concept must be based on one real hook template.

Important:
The hook is internal.
Do not mention the hook in the user-facing concept text.
Do not write "hook", "הוק", "based on", "inspired by", or "בהשראת".
The user-facing concept should contain only the idea.

Every concept must include internal hook metadata:
- source_hook_template_id (use the exact ID from the list provided)
- original_hook_template (copy the English template exactly)
- hebrew_hook_template (copy the Hebrew template exactly)
- filled_hook_internal (fill in placeholders with the specific business)

The concept itself should be written as a practical idea:
what happens, who says/does what, why it matters.

Write in living Israeli Hebrew. Not translated Hebrew. Not agency Hebrew.

Do not write:
"סרטון שמציג..."
"נראה את..."
"נציג את..."
"נחבר את הצופה..."
"האווירה של המקום..."
"תוכן אותנטי..."
"ערך אמיתי..."
"מקצועיות..."
"איכות..."

Every concept must be: specific, practical, shootable tomorrow, clear from the first sentence.

Return valid JSON only. No markdown.`;

Deno.serve(async (req) => {
  return Response.json({ error: "Deprecated: legacy OpenAI concept generation is disabled in production." }, { status: 410 });
});

/*
Legacy OpenAI implementation retained below for reference only.
Production flow no longer routes here.
*/

/*
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
      prompt_version: "hook_driven_concepts_v3_fast",
    });

    // Load relevant hook templates — prioritize by style, max 30
    const preferredCategories = STYLE_TO_CATEGORY[selected_video_style] || ["educational", "storytelling", "random"];
    const allTemplates = await base44.asServiceRole.entities.LockedHookTemplates.filter({ is_active: true });

    if (allTemplates.length === 0) {
      await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, { status: "failed" });
      return Response.json({ error: "No hook templates found in LockedHookTemplates. Please import templates first." }, { status: 500 });
    }

    const preferred = allTemplates.filter(t => preferredCategories.includes(t.source_category) && t.concept_generation_fit !== false);
    const others = allTemplates.filter(t => !preferredCategories.includes(t.source_category) && t.concept_generation_fit !== false);
    // Shuffle for variety
    const shuffled = [...preferred.sort(() => Math.random() - 0.5), ...others.sort(() => Math.random() - 0.5)];
    const selectedTemplates = shuffled.slice(0, HOOK_TEMPLATE_RETRIEVAL_LIMIT);

    await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, {
      total_templates_loaded: selectedTemplates.length,
    });

    // Build template list with full metadata for the model to reference
    const templateList = selectedTemplates.map((t) =>
      `TEMPLATE_ID: ${t.id}
  category: ${t.source_category || ""}
  mechanic: ${t.hook_mechanic || ""}
  original_en: "${t.original_template || ""}"
  hebrew: "${t.hebrew_template || ""}"`
    ).join("\n---\n");

    // STEP 1: Generate 10 raw concepts — each linked to a real template
    const conceptPrompt = `Business: ${client_name}
Goal: ${main_goal || ""}
Industry: ${industry || "general"}
Notes: ${raw_notes || ""}
Creative DNA: ${JSON.stringify(creative_dna || {})}
Video style: ${selected_video_style}
Already used styles: ${(existing_categories || []).join(", ") || "none"}

Available hook templates (you MUST use IDs from this list):
${templateList}

Generate exactly ${HOOK_CONCEPT_GENERATION_COUNT} video concepts. Rules:
1. Each concept MUST reference one template by its TEMPLATE_ID.
2. Copy original_en and hebrew exactly into original_hook_template and hebrew_hook_template.
3. filled_hook_internal = fill in the Hebrew template with business-specific details.
4. short_description = the concept idea ONLY. Never mention the hook. No "הוק", no "based on", no "בהשראת".
5. short_description: 2-3 sentences. Who, where, what action, tension. Specific and shootable.
6. Vary approaches across concepts.
7. Never use: "סרטון שמציג", "נראה את", "נציג את", "אווירה", "חוויה".

Return ONLY valid JSON:
{
  "raw_concepts": [
    {
      "source_hook_template_id": "exact ID from TEMPLATE_ID above",
      "source_hook_category": "category from template",
      "source_hook_mechanic": "mechanic from template",
      "original_hook_template": "exact English template text",
      "hebrew_hook_template": "exact Hebrew template text",
      "filled_hook_internal": "Hebrew template filled with business details",
      "concept_title": "max 5 Hebrew words",
      "short_description": "2-3 sentences idea only — NO hook mention",
      "video_style": "${selected_video_style}",
      "why_it_works": "1 sentence practical reason",
      "idea_tags": ["תג1", "תג2"]
    }
  ]
}`;

    const conceptResponse = await openai.chat.completions.create({
      model: STRATEGY_MODEL,
      temperature: 0.8,
      max_completion_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: conceptPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const rawResult = JSON.parse(conceptResponse.choices[0].message.content);
    const rawConcepts = rawResult.raw_concepts || [];

    // Validate that every concept has a source_hook_template_id referencing a real template
    const templateIdSet = new Set(selectedTemplates.map(t => t.id));
    const validConcepts = rawConcepts.filter(c => c.source_hook_template_id && c.filled_hook_internal);

    await base44.asServiceRole.entities.HookDrivenGenerationRuns.update(generationRun.id, {
      total_raw_concepts_generated: rawConcepts.length,
    });

    // STEP 2: Score all concepts in one call
    const scorePrompt = `Score these ${validConcepts.length} Israeli video concepts for quality.

Video style: ${selected_video_style}
Business: ${client_name}
Goal: ${main_goal || ""}

Concepts:
${validConcepts.map((c, i) => `[${i}] Title: "${c.concept_title}" | Desc: "${c.short_description}"`).join("\n")}

Score each 0-100. Reject (keep:false) if: generic, no real person/action/tension, "אווירה"/"מגוון"/"חוויה", could fit any business.

Return valid JSON:
{
  "scores": [{ "index": 0, "score": 85, "keep": true }]
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

    const scoredConcepts = validConcepts.map((c, i) => {
      const s = scores.find(x => x.index === i) || { score: 60, keep: true };
      return { ...c, _score: s.score, _keep: s.keep !== false && s.score >= 60 };
    }).sort((a, b) => b._score - a._score);

    let finalConcepts = scoredConcepts.filter(c => c._keep).slice(0, FINAL_CONCEPT_COUNT);

    // Fill up to 4 if needed
    if (finalConcepts.length < FINAL_CONCEPT_COUNT) {
      const remaining = scoredConcepts.filter(c => !c._keep);
      finalConcepts = [...finalConcepts, ...remaining].slice(0, FINAL_CONCEPT_COUNT);
    }

    // Save all candidates to DB with full internal hook metadata
    for (const c of finalConcepts) {
      // Look up full template from DB for extra metadata
      const tpl = selectedTemplates.find(t => t.id === c.source_hook_template_id);
      await base44.asServiceRole.entities.HookDrivenConceptCandidates.create({
        generation_run_id: generationRun.id,
        project_id,
        concept_title: c.concept_title,
        short_description: c.short_description,
        filled_hook: c.filled_hook_internal,
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

    // User-facing output: NO hook data
    const userFacingConcepts = finalConcepts.map(c => ({
      concept_title: c.concept_title,
      short_description: c.short_description,
      video_style: c.video_style || selected_video_style,
      idea_tags: c.idea_tags || [],
      why_it_works: c.why_it_works,
      // Internal fields stored on concept object for CTAPicker/BodyPicker (hook hidden from UI)
      _internal: {
        source_hook_template_id: c.source_hook_template_id,
        source_hook_category: c.source_hook_category,
        source_hook_mechanic: c.source_hook_mechanic,
        original_hook_template: c.original_hook_template,
        hebrew_hook_template: c.hebrew_hook_template,
        filled_hook_internal: c.filled_hook_internal,
      },
      full_concept_data: {},
    }));

    return Response.json({
      concepts: userFacingConcepts,
      generation_run_id: generationRun.id,
      _debug: {
        templates_available: allTemplates.length,
        templates_loaded: selectedTemplates.length,
        raw_concepts_generated: rawConcepts.length,
        valid_concepts: validConcepts.length,
        concepts_passed_scoring: scoredConcepts.filter(c => c._keep).length,
        final_count: finalConcepts.length,
      },
    });

  } catch (error) {
    console.error("generateConceptsFromHookBank error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
*/
