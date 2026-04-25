import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

const FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || "gpt-4o-mini";
const STRATEGY_MODEL = Deno.env.get("OPENAI_STRATEGY_MODEL") || "gpt-4o";

const SYSTEM_PROMPT = `You are Briefi, an Israeli social media brief-building assistant.

Your job is to help social media managers create client-ready short-form video briefs.

You do not write generic marketing content.
You do not create the full brief immediately.
You guide the user step by step.

The flow is:
1. Analyze the business
2. Create Creative DNA
3. Generate 4 hook options
4. Generate 4 body structure options based on the selected hook
5. Generate 4 CTA options based on the selected hook and selected body
6. Assemble a clean final video brief

Write in Hebrew unless the user asks otherwise.

Important voice rules:
- Write in practical Israeli Hebrew.
- Prioritize clarity over cleverness.
- The output must be usable in a real client brief.
- Do not sound like an American marketing guru translated into Hebrew.
- Do not overuse cynicism.
- Do not make the product sound weaker just to appear authentic.
- Avoid fake Gen Z slang.
- Avoid overly soft emotional branding unless the user asks for it.
- Strong CTAs are allowed.
- Promotional language is allowed when the category is sales or brand image.
- Humor should be simple, clear, and client-approvable.
- Avoid vague phrases unless they are useful for the client.
- Never give 4 versions of the same idea.

When creating 4 options, vary them:
1. Safe/client-friendly
2. Social/native
3. Funny/light or more human
4. Sharper/riskier

Always keep the output structured and easy to display in UI.
Return valid JSON only. No markdown, no code blocks, no explanations.`;

function estimateCost(inputTokens, outputTokens, model) {
  const pricing = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
  };
  const key = Object.keys(pricing).find(k => model.includes(k.replace("gpt-4o-mini", "4o-mini").replace("gpt-4o", "4o"))) || "gpt-4o-mini";
  const p = pricing[key] || pricing["gpt-4o-mini"];
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
}

async function callOpenAI(openai, model, userPrompt, jsonSchema) {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    max_completion_tokens: 2500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);
  const usage = response.usage || {};
  return { parsed, inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0 };
}

async function saveGeneration(base44, userId, projectId, actionType, model, inputPayload, outputPayload, inputTokens, outputTokens, success, errorMessage) {
  const cost = estimateCost(inputTokens, outputTokens, model);
  const gen = await base44.asServiceRole.entities.Generation.create({
    user_id: userId,
    project_id: projectId,
    action_type: actionType,
    model,
    input_payload: inputPayload,
    output_payload: outputPayload,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: cost,
    success,
    error_message: errorMessage || null
  });
  // Track API usage
  await base44.asServiceRole.entities.ApiUsage.create({
    user_id: userId,
    project_id: projectId,
    generation_id: gen.id,
    action_type: actionType,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: cost
  });
  return gen;
}

function buildIntelligenceContext(voiceRules, hookPatterns, goodExamples, badExamples, trendPatterns, category) {
  let ctx = "";

  const globalRules = (voiceRules || []).filter(r => r.is_active && r.category === "global");
  const catRules = (voiceRules || []).filter(r => r.is_active && r.category === category);
  const allRules = [...globalRules, ...catRules];
  if (allRules.length) {
    ctx += "\n\n--- VOICE RULES ---\n";
    allRules.forEach(r => {
      ctx += `[${r.rule_type.toUpperCase()}] ${r.rule_text}\n`;
      if (r.example_good) ctx += `  ✓ Good: "${r.example_good}"\n`;
      if (r.example_bad) ctx += `  ✗ Avoid: "${r.example_bad}"\n`;
    });
  }

  const matchingPatterns = (hookPatterns || []).filter(p => p.is_active && (!p.category_fit?.length || p.category_fit.includes(category)));
  if (matchingPatterns.length) {
    ctx += "\n\n--- HOOK PATTERNS TO DRAW FROM ---\n";
    matchingPatterns.slice(0, 6).forEach(p => {
      ctx += `• ${p.pattern_name}: "${p.template}"\n  Example: "${p.example_hebrew}"\n`;
    });
  }

  const goods = (goodExamples || []).filter(e => e.is_active).slice(0, 5);
  if (goods.length) {
    ctx += "\n\n--- GOOD EXAMPLES TO IMITATE ---\n";
    goods.forEach(e => ctx += `• "${e.example_text}" — ${e.why_it_works}\n`);
  }

  const bads = (badExamples || []).filter(e => e.is_active).slice(0, 5);
  if (bads.length) {
    ctx += "\n\n--- BAD EXAMPLES TO AVOID ---\n";
    bads.forEach(e => ctx += `• "${e.bad_text}" — ${e.why_bad}\n`);
  }

  const trends = (trendPatterns || []).filter(t => t.is_active && (!t.category_fit?.length || t.category_fit.includes(category) || category === "טרנדי"));
  if (trends.length) {
    ctx += "\n\n--- TREND FORMATS ---\n";
    trends.slice(0, 4).forEach(t => ctx += `• ${t.trend_name}: "${t.example_hebrew}"\n`);
  }

  return ctx;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  const body = await req.json();
  const { action, ...payload } = body;

  // Load intelligence tables once
  const [voiceRules, hookPatterns, goodExamples, badExamples, trendPatterns] = await Promise.all([
    base44.asServiceRole.entities.VoiceRule.list(),
    base44.asServiceRole.entities.HookPattern.list(),
    base44.asServiceRole.entities.GoodExample.list(),
    base44.asServiceRole.entities.BadExample.list(),
    base44.asServiceRole.entities.TrendPattern.list()
  ]);

  const intelligenceCtx = buildIntelligenceContext(voiceRules, hookPatterns, goodExamples, badExamples, trendPatterns, payload.selected_category || "");

  // ── ACTION: generateCreativeDNA ────────────────────────────────────────────
  if (action === "generateCreativeDNA") {
    const { project_id, client_name, main_goal, raw_notes } = payload;
    const prompt = `Analyze this Israeli business and generate Creative DNA for social media content.

Client: ${client_name}
Goal: ${main_goal}
Notes: ${raw_notes}
${intelligenceCtx}

Return JSON:
{
  "main_angle": "The core strategic angle for content",
  "audience_truth": "What the audience actually feels or needs",
  "what_is_interesting": "What is genuinely interesting about this business",
  "what_to_avoid": "What to avoid in content for this business",
  "recommended_content_directions": ["direction1", "direction2", "direction3"]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateCreativeDNA", STRATEGY_MODEL, { client_name, main_goal, raw_notes }, parsed, inputTokens, outputTokens, true);
    await base44.asServiceRole.entities.Project.update(project_id, { creative_dna: parsed });
    return Response.json({ creative_dna: parsed });
  }

  // ── ACTION: generateHooks ──────────────────────────────────────────────────
  if (action === "generateHooks") {
    const { project_id, client_name, main_goal, creative_dna, selected_category } = payload;
    const prompt = `Generate exactly 4 hook options for this video.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Creative DNA: ${JSON.stringify(creative_dna)}
${intelligenceCtx}

Return JSON with exactly 4 hooks:
{
  "hooks": [
    {
      "hook_title": "short title",
      "hook_text": "the actual opening line of the video (1-2 sentences max)",
      "why_it_works": "brief explanation",
      "risk_level": "נמוך | בינוני | גבוה",
      "best_for": "what kind of audience this works best for"
    }
  ]
}

Vary the 4 hooks: 1) Safe/client-friendly, 2) Social/native, 3) Funny/human, 4) Sharper/riskier`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateHooks", FAST_MODEL, { client_name, main_goal, selected_category, creative_dna }, parsed, inputTokens, outputTokens, true);
    return Response.json(parsed);
  }

  // ── ACTION: generateBodyOptions ────────────────────────────────────────────
  if (action === "generateBodyOptions") {
    const { project_id, client_name, main_goal, creative_dna, selected_category, selected_hook } = payload;
    const prompt = `Generate exactly 4 body structure options for this video.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Creative DNA: ${JSON.stringify(creative_dna)}
Selected hook: ${JSON.stringify(selected_hook)}
${intelligenceCtx}

Return JSON with exactly 4 body options:
{
  "body_options": [
    {
      "body_title": "short name for this structure",
      "concept_summary": "1-2 sentence description of the video concept",
      "shot_flow": ["shot 1 description", "shot 2 description", "shot 3 description"],
      "text_overlays": ["overlay text 1", "overlay text 2"],
      "production_notes": "brief practical filming note",
      "why_this_structure_works": "why this works for this hook and category"
    }
  ]
}

Vary the 4 options: 1) Simple/low-effort, 2) Visual/cinematic, 3) Talking-head/direct, 4) Story-based`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateBodyOptions", STRATEGY_MODEL, { client_name, selected_category, selected_hook, creative_dna }, parsed, inputTokens, outputTokens, true);
    return Response.json(parsed);
  }

  // ── ACTION: generateCTAOptions ─────────────────────────────────────────────
  if (action === "generateCTAOptions") {
    const { project_id, client_name, main_goal, creative_dna, selected_category, selected_hook, selected_body } = payload;
    const prompt = `Generate exactly 4 CTA options for this video.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Selected hook: ${JSON.stringify(selected_hook)}
Selected body: ${JSON.stringify(selected_body)}
${intelligenceCtx}

Return JSON with exactly 4 CTAs, one of each type:
{
  "ctas": [
    {
      "cta_type": "ישיר | רך | שמירה / שיתוף | פנייה / הודעה",
      "cta_text": "the actual CTA text as it would appear in the video",
      "why_it_fits": "why this CTA fits this video"
    }
  ]
}

Use exactly these 4 types in order: ישיר, רך, שמירה / שיתוף, פנייה / הודעה`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateCTAOptions", FAST_MODEL, { client_name, main_goal, selected_category, selected_hook, selected_body }, parsed, inputTokens, outputTokens, true);
    return Response.json(parsed);
  }

  // ── ACTION: assembleFinalBrief ─────────────────────────────────────────────
  if (action === "assembleFinalBrief") {
    const { project_id, client_name, main_goal, creative_dna, selected_category, selected_hook, selected_body, selected_cta } = payload;
    const prompt = `Assemble a final client-ready, shootable video brief based on these selections.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Creative DNA: ${JSON.stringify(creative_dna)}
Selected hook: ${JSON.stringify(selected_hook)}
Selected body: ${JSON.stringify(selected_body)}
Selected CTA: ${JSON.stringify(selected_cta)}
${intelligenceCtx}

CRITICAL RULES:
- Write entirely in Hebrew.
- The hook must fit within the first 2 seconds of a Reel or TikTok — keep it short and punchy.
- script_text is MANDATORY. It must be the actual spoken text for the video — voiceover, person talking to camera, short dialogue, or text-only if no one speaks. It must sound natural in spoken Hebrew. Do NOT leave it empty or vague.
- shot_structure must describe exactly what to film and what is said/shown at each step.
- Avoid generic marketing copy. Make every line practical and shootable.
- Choose the script_format that fits the category and business context best.
- If the video works better without voiceover, use script_format: "text_only" and strengthen text_overlays.

Return JSON exactly:
{
  "brief_title": "short descriptive title in Hebrew",
  "video_concept": "1-2 sentence description of the video concept in Hebrew",
  "hook": "the hook text exactly as it opens the video — short, max 2 seconds spoken",
  "script_format": "voiceover | person_to_camera | dialogue | text_only",
  "script_text": "the full spoken script or narration text in natural Hebrew — this is what the person says or what appears as text. Must be complete and usable.",
  "shot_structure": [
    { "step": 1, "visual": "what is filmed/shown", "spoken_or_overlay_text": "what is said or shown as text" },
    { "step": 2, "visual": "what is filmed/shown", "spoken_or_overlay_text": "what is said or shown as text" },
    { "step": 3, "visual": "what is filmed/shown", "spoken_or_overlay_text": "what is said or shown as text" }
  ],
  "text_overlays": ["overlay 1", "overlay 2", "overlay 3"],
  "cta": "the CTA text exactly as spoken or shown",
  "caption_suggestion": "a suggested social media caption in Hebrew",
  "production_notes": "practical filming notes — location, lighting, tone, pace",
  "client_risk_level": "נמוך | בינוני | גבוה"
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "assembleFinalBrief", STRATEGY_MODEL, { client_name, selected_category, selected_hook, selected_body, selected_cta }, parsed, inputTokens, outputTokens, true);
    return Response.json({ final_brief: parsed });
  }

  // ── ACTION: rewriteOption ──────────────────────────────────────────────────
  if (action === "rewriteOption") {
    const { project_id, original_text, rewrite_action, business_context, selected_category } = payload;
    const prompt = `Rewrite this text with the following instruction: "${rewrite_action}"

Original text: "${original_text}"
Business context: ${business_context || ""}
Category: ${selected_category || ""}
${intelligenceCtx}

Return JSON:
{
  "rewritten_text": "the rewritten version",
  "what_changed": "1 short sentence explaining what changed"
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "rewriteOption", FAST_MODEL, { original_text, rewrite_action, selected_category }, parsed, inputTokens, outputTokens, true);
    return Response.json(parsed);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});