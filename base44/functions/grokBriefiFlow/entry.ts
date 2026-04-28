import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || "gpt-4o-mini";
const OPENAI_STRATEGY_MODEL = Deno.env.get("OPENAI_STRATEGY_MODEL") || "gpt-4o";

const FORBIDDEN_PHRASES = `
Forbidden phrases (NEVER use these):
- "חוויה בלתי נשכחת"
- "בואו ליהנות"
- "המקום המושלם"
- "עקבו לעוד"
- "אתם חייבים לראות"
- "חוויה מדהימה"
- "שירות מקצועי ואיכותי"
- "תוצאה מושלמת"
- "אווירה קסומה"
- "יחס אישי ומקצועי"
- "סרטון שמציג"
- "נציג את"
- "נראה את"
`;

// ── Grok caller ────────────────────────────────────────────────────────────────
async function callGrok(systemPrompt, userPrompt, temperature = 0.7) {
  const apiRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
    }),
  });
  if (!apiRes.ok) {
    const errText = await apiRes.text();
    throw new Error(`xAI API error: ${apiRes.status} — ${errText}`);
  }
  const data = await apiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Grok");
  return content;
}

// ── OpenAI fallback caller ─────────────────────────────────────────────────────
async function callOpenAIFallback(systemPrompt, userPrompt, temperature = 0.7) {
  if (!OPENAI_API_KEY) throw new Error("No OpenAI API key for fallback");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: OPENAI_FAST_MODEL,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  return response.choices[0].message.content;
}

// ── Parse JSON with markdown stripping ────────────────────────────────────────
function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Call with Grok + OpenAI fallback ──────────────────────────────────────────
async function callWithFallback(systemPrompt, userPrompt, temperature = 0.7) {
  let provider = "grok";
  let raw;
  try {
    raw = await callGrok(systemPrompt, userPrompt, temperature);
    const parsed = parseJSON(raw);
    return { parsed, provider };
  } catch (grokErr) {
    console.error("Grok failed, trying OpenAI fallback:", grokErr.message);
    provider = "openai_fallback";
    raw = await callOpenAIFallback(systemPrompt, userPrompt, temperature);
    const parsed = parseJSON(raw);
    return { parsed, provider };
  }
}

// ── STEP: Generate concept options (Grok, used when ConceptBank < 4) ─────────
const CONCEPT_GEN_SYSTEM = `You are Briefi Concept Generator for Israeli social media.

Generate exactly 4 video concept options for the given business.
All concepts must be bold, specific, and immediately shootable with a phone.
Write in natural Israeli Hebrew.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "concepts": [
    {
      "concept_name": "short punchy name 2-5 words",
      "core_situation": "2-3 sentences describing the scene — who, where, what happens",
      "natural_opening_line": "the opening spoken line, max 2 seconds",
      "human_tension": "what creates tension or contradiction",
      "scene_logic": ["step 1", "step 2", "step 3"],
      "punchline": "how it ends",
      "visual_proofs": ["visual 1", "visual 2"],
      "tone_tags": ["tag1", "tag2"],
      "cta_options": ["cta 1", "cta 2"],
      "best_for": ["goal or context"]
    }
  ]
}`;

// ── STEP: Generate body/script options ────────────────────────────────────────
const BODY_GEN_SYSTEM = `You are Briefi Body/Script Generator for Israeli social media.

Generate exactly 4 body/script structure options for this video concept.
Each option must be practical and shootable tomorrow with a phone.
Write in natural Israeli Hebrew.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "body_options": [
    {
      "body_title": "short option name 2-4 words",
      "scene_preview": "2-3 sentences: who is there, what happens, what the tension is",
      "script_format": "person_to_camera | voiceover | dialogue | text_only | acted_scene",
      "spoken_lines": ["line 1", "line 2", "line 3"],
      "on_screen_text": ["text 1", "text 2"],
      "shot_sequence": ["shot 1 description", "shot 2 description", "shot 3 description", "shot 4 description"],
      "visual_shots_needed": ["shot type 1", "shot type 2"],
      "practical_note": "one short filming instruction",
      "why_this_works": "one sentence"
    }
  ]
}`;

// ── STEP: Generate CTA options ────────────────────────────────────────────────
const CTA_GEN_SYSTEM = `You are Briefi CTA Generator for Israeli social media.

Generate exactly 4 CTA options.
Each must be natural Israeli Hebrew — not corporate, not American, not generic.
Match the video tone and business goal.

${FORBIDDEN_PHRASES}

Rules:
- No "עקבו לעוד"
- No "אתם חייבים לראות"  
- No "שיתפו עם חברים" as the only option
- CTAs must feel like something a real Israeli person would say or write
- Include variety: direct, soft, save/share, DM/message

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "cta_options": [
    {
      "cta_type": "ישיר | רך | שמירה / שיתוף | פנייה / הודעה",
      "cta_text": "the actual CTA text in Hebrew",
      "why_it_fits": "one sentence why this fits this specific video"
    }
  ]
}`;

// ── STEP: Assemble final brief ─────────────────────────────────────────────────
const FINAL_BRIEF_SYSTEM = `You are Briefi Final Brief Assembler for Israeli social media.

Assemble a complete, client-ready shooting brief from the selected concept, body/script, and CTA.
Write in natural Israeli Hebrew.
The brief must be shootable tomorrow with a phone.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "brief_title": "short title",
  "video_concept": "1-2 sentence concept in Hebrew",
  "hook": "exact opening line, max 2 seconds spoken",
  "script_format": "person_to_camera | voiceover | dialogue | text_only",
  "script_text": "the full spoken script or text-led script — complete natural Hebrew",
  "shot_structure": [
    { "step": 1, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" }
  ],
  "text_overlays": ["overlay 1", "overlay 2"],
  "cta": "the CTA text",
  "caption_suggestion": "social caption in Hebrew",
  "visual_must_haves": ["must-have visual 1", "must-have visual 2"],
  "production_notes": "specific practical filming notes",
  "why_it_works": "why this concept works for this business"
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (!XAI_API_KEY) return Response.json({ error: "XAI_API_KEY is not set" }, { status: 500 });

    const body = await req.json();
    const { action, project_id, business, selectedConcept, selectedBody, selectedCTA, category_id, selectedVideoStyle } = body;

    // ── generateConcepts ────────────────────────────────────────────────────────
    if (action === "generateConcepts") {
      if (!business) {
        return Response.json({ error: "business is required" }, { status: 400 });
      }

      const videoStyle = selectedVideoStyle || "מצחיק";
      let contextRows = "";

      // For טרנדי: load TrendPatterns as structural context
      if (videoStyle === "טרנדי") {
        const trendPatterns = await base44.asServiceRole.entities.TrendPattern.filter({ is_active: true });
        const shuffled = trendPatterns.sort(() => Math.random() - 0.5).slice(0, 4);
        if (shuffled.length > 0) {
          contextRows = "\n\nTREND PATTERNS TO USE (apply each to this business — do NOT copy examples, do NOT mention 'trend'):\n";
          shuffled.forEach((t, i) => {
            contextRows += `\nPattern ${i + 1}:\n  Mechanic: ${t.core_mechanic}\n  Why it works: ${t.why_it_works}\n  Adaptation guide: ${t.briefi_adaptation}\n`;
          });
        }
      } else if (category_id) {
        // Use ConceptBank as structural inspiration (not sole source)
        const bankConcepts = await base44.asServiceRole.entities.ConceptBank.filter({ category_id, is_active: true });
        const bankSample = bankConcepts.sort(() => Math.random() - 0.5).slice(0, 2);
        if (bankSample.length > 0) {
          contextRows = "\n\nCONCEPT INSPIRATIONS (use as structural reference only, generate original content):\n";
          bankSample.forEach(c => {
            contextRows += `- ${c.concept_name}: ${c.core_situation}\n`;
          });
        }
      }

      const conceptSystemPrompt = `You are Briefi Concept Generator for Israeli social media.

Generate exactly 4 video concept options for the given business and video style.
All concepts must match the requested video style exactly.
All concepts must be bold, specific, and immediately shootable with a phone.
Write in natural Israeli Hebrew.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "concepts": [
    {
      "concept_title": "short punchy title 2-5 words",
      "short_description": "2-3 sentences: what happens on screen, who is there, what is the tension",
      "why_it_works": "one sentence practical reason",
      "idea_tags": ["tag1", "tag2", "tag3"]
    }
  ]
}`;

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Requested video style: ${videoStyle}

Style guide:
- מצחיק: skit, funny situation, punchline, something people forward
- תדמית: personality, attitude, trust-building without sounding corporate
- סרטון אווירה: vibe, place, movement, small moments
- סרטון הכרות: who is behind the business, no speech, no "nice to meet you"
- מכירתי: sell without sounding like an ad
- כאב / פתרון: real customer pain the business solves
- טרנדי: use the provided trend patterns below
- חינוכי: tip, explanation, common mistake, or something people don't know
- השוואה: before/after, cheap/expensive, expected vs reality
- מיתוס / ניפוץ: break a belief people hold about this business/industry
${contextRows}

Generate 4 strong, original video concepts in the "${videoStyle}" style for this specific business.
Each concept must clearly reflect the "${videoStyle}" style from the first sentence.
Do NOT start any description with: "סרטון שמציג", "נציג את", "נראה את", "לקוחות נהנים".`;

      const { parsed, provider } = await callWithFallback(conceptSystemPrompt, userPrompt, 0.85);

      // Ensure we always have exactly 4
      const concepts = (parsed.concepts || []).slice(0, 4);

      return Response.json({
        concepts,
        source: "grok_generated",
        provider_log: { provider_used: provider, step_name: "concept", success: true },
      });
    }

    // ── generateBodyOptions ─────────────────────────────────────────────────────
    if (action === "generateBodyOptions") {
      if (!business || !selectedConcept) {
        return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
      }

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Category: ${category_id || ""}
Goal: ${business.main_goal}

Selected concept:
${JSON.stringify(selectedConcept, null, 2)}

Generate 4 different body/script structure options for this specific concept. 
Each option should interpret the concept differently (e.g. dialogue vs voiceover vs text-only).
All must be practical and shootable.`;

      const { parsed, provider } = await callWithFallback(BODY_GEN_SYSTEM, userPrompt, 0.75);

      return Response.json({
        body_options: parsed.body_options || [],
        provider_log: { provider_used: provider, step_name: "body", success: true },
      });
    }

    // ── generateCTAOptions ──────────────────────────────────────────────────────
    if (action === "generateCTAOptions") {
      if (!business || !selectedConcept || !selectedBody) {
        return Response.json({ error: "business, selectedConcept, and selectedBody required" }, { status: 400 });
      }

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Selected concept:
${JSON.stringify(selectedConcept, null, 2)}

Selected body/script:
${JSON.stringify(selectedBody, null, 2)}

Generate 4 CTA options that are natural, specific to this video, and feel Israeli.
Match the tone of the body/script selected.`;

      const { parsed, provider } = await callWithFallback(CTA_GEN_SYSTEM, userPrompt, 0.7);

      return Response.json({
        cta_options: parsed.cta_options || [],
        provider_log: { provider_used: provider, step_name: "cta", success: true },
      });
    }

    // ── assembleFinalBrief ──────────────────────────────────────────────────────
    if (action === "assembleFinalBrief") {
      if (!business || !selectedConcept || !selectedBody || !selectedCTA) {
        return Response.json({ error: "business, selectedConcept, selectedBody, selectedCTA required" }, { status: 400 });
      }

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Category: ${category_id || ""}
Goal: ${business.main_goal}

Selected concept:
${JSON.stringify(selectedConcept, null, 2)}

Selected body/script option:
${JSON.stringify(selectedBody, null, 2)}

Selected CTA:
${JSON.stringify(selectedCTA, null, 2)}

Assemble one complete, clean shooting brief from the selections above.
Do not invent new ideas — use the selected pieces.
Write the full script_text as complete natural spoken Hebrew.
Make it immediately usable for filming.`;

      const { parsed, provider } = await callWithFallback(FINAL_BRIEF_SYSTEM, userPrompt, 0.6);

      // Validate required fields
      const required = ["brief_title", "video_concept", "hook", "script_text", "cta"];
      const missing = required.filter(f => !parsed[f]);
      if (missing.length > 0) {
        return Response.json({
          error: `Incomplete brief from AI — missing: ${missing.join(", ")}. Please try again.`,
          partial: parsed,
        }, { status: 422 });
      }

      // Save VideoBrief to DB
      let savedBrief = null;
      if (project_id) {
        const existingBriefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id });
        savedBrief = await base44.asServiceRole.entities.VideoBrief.create({
          project_id,
          category: category_id || "",
          brief_title: parsed.brief_title,
          video_concept: parsed.video_concept,
          hook: parsed.hook,
          script_text: parsed.script_text,
          shot_structure: parsed.shot_structure || [],
          cta: parsed.cta,
          caption_suggestion: parsed.caption_suggestion || "",
          production_notes: parsed.production_notes || "",
          visual_must_haves: parsed.visual_must_haves || [],
          risk_notes: parsed.why_it_works || "",
          idea_tags: selectedConcept.tone_tags || [],
          script_format: parsed.script_format || "person_to_camera",
          adapted_brief: parsed,
          status: "draft",
        });

        // Update project count
        await base44.asServiceRole.entities.Project.update(project_id, {
          completed_briefs_count: (existingBriefs.length || 0) + 1,
          status: "in_progress",
        });
      }

      return Response.json({
        final_brief: parsed,
        brief_id: savedBrief?.id || null,
        provider_log: { provider_used: provider, step_name: "final_brief", success: true },
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("grokBriefiFlow error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});