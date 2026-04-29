import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || "gpt-4o-mini";

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
- "קריאייטיב" (as a job title / person — use "הצלם", "מנהל הסושיאל", "מי שמצלם", "היוצר", "בעל העסק" instead)
- "כשהקריאייטיב מצלם" → use "כשהצלם מצלם" or "כשמצלמים"
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

// ── SYSTEM PROMPTS ─────────────────────────────────────────────────────────────

const CONCEPT_GEN_SYSTEM = `You are Briefi Concept Generator for Israeli social media.

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

// Opening lines generated from hook bank templates — EXACT template usage
const OPENING_GEN_FROM_TEMPLATES_SYSTEM = `You are Briefi Hook Translator and Matcher for Israeli social media.

You receive a selected video concept, business notes, and a list of real hook templates from LockedHookTemplates.

Your job:
Choose 4 hook templates that fit the selected concept and turn them into Hebrew opening lines.

CRITICAL RULES — DO NOT VIOLATE:
1. You are NOT writing new hooks.
2. You are NOT improving the hooks.
3. You are NOT using the hook bank as inspiration.
4. You MUST use the templates exactly — preserving wording, structure, order, tension.

If a template is in English:
Translate it into Hebrew while preserving the EXACT structure, order, tension, and placeholders.
Do NOT rewrite creatively. Do NOT improve. Do NOT change the meaning.
Do NOT add emojis, "בואו", "אל תפספסו", "חדש אצלנו", or any marketing language.
Do NOT shorten unless Hebrew grammar requires a tiny adjustment.

If a template has placeholders like (insert X):
Fill ONLY the placeholders using the selected concept and business context.
Do NOT rewrite the template skeleton around the placeholders.
Do NOT add new claims or extra sentences.

Each output MUST be traceable to one source_hook_template_id.
Use the id field provided in the template list.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "opening_options": [
    {
      "opening_line": "the final Hebrew opening line with placeholders filled",
      "why_it_fits": "one short sentence — why this template fits the concept",
      "mechanic_tag": "short mechanic label e.g. 'שאלה', 'ניפוץ ציפיות', 'הצהרה חזקה', 'השוואה', 'סיפור'",
      "source_type": "hook_bank",
      "source_hook_template_id": "the id from the template",
      "original_template": "the original English template text",
      "hebrew_template": "literal Hebrew translation of the template structure",
      "filled_opening_line": "same as opening_line — the filled final version",
      "filled_slots": {}
    }
  ]
}`;

const OPENING_GEN_GROK_SYSTEM = `You are Briefi Opening Line Generator for Israeli social media.

Generate exactly 4 original opening lines for this video concept and business.

Rules:
- Each line is the very first sentence of the video — it must grab attention immediately.
- Write in natural, spoken Israeli Hebrew.
- Maximum 2 seconds when spoken aloud.
- Match the video style.
- Each line must use a different emotional mechanic (e.g. shock, question, contradiction, humor, bold claim).

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "opening_options": [
    {
      "opening_line": "the actual opening line in Hebrew",
      "why_it_fits": "one short sentence",
      "mechanic_tag": "short label e.g. 'שאלה', 'ניפוץ ציפיות', 'הצהרה חזקה', 'הומור', 'הפתעה'",
      "source_type": "grok_generated",
      "source_hook_template_id": null,
      "original_hook_template": null,
      "hebrew_hook_template": null,
      "filled_hook": null
    }
  ]
}`;

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

const FINAL_BRIEF_SYSTEM = `You are Briefi Final Brief Assembler for Israeli social media.

Assemble a complete, client-ready shooting brief from the selected concept, opening line, and CTA.
Write in natural Israeli Hebrew.
The brief must be shootable tomorrow with a phone.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "brief_title": "short title",
  "video_concept": "1-2 sentence concept in Hebrew",
  "hook": "exact opening line — use the selected opening line",
  "script_format": "person_to_camera | voiceover | dialogue | text_only",
  "script_text": "the full spoken script or text-led script — complete natural Hebrew",
  "shot_structure": [
    { "step": 1, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" }
  ],
  "text_overlays": ["overlay 1", "overlay 2"],
  "cta": "the CTA text",
  "video_description": "social caption in Hebrew — תיאור הסרטון",
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
    const { action, project_id, business, selectedConcept, selectedOpening, selectedBody, selectedCTA, selectedVideoStyle, businessAnalysis } = body;

    // ── generateConcepts ────────────────────────────────────────────────────────
    if (action === "generateConcepts") {
      if (!business) {
        return Response.json({ error: "business is required" }, { status: 400 });
      }

      const videoStyle = selectedVideoStyle || "מצחיק";
      let contextRows = "";

      if (videoStyle === "טרנדי") {
        const trendPatterns = await base44.asServiceRole.entities.TrendPattern.filter({ is_active: true });
        const shuffled = trendPatterns.sort(() => Math.random() - 0.5).slice(0, 4);
        if (shuffled.length > 0) {
          contextRows = "\n\nTREND PATTERNS TO USE (apply each to this business — do NOT copy examples, do NOT mention 'trend'):\n";
          shuffled.forEach((t, i) => {
            contextRows += `\nPattern ${i + 1}:\n  Mechanic: ${t.core_mechanic}\n  Why it works: ${t.why_it_works}\n  Adaptation guide: ${t.briefi_adaptation}\n`;
          });
        }
      }

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Requested video style: ${videoStyle}

Style guide:
- מצחיק: skit, funny situation, punchline, something people forward
- תדמית: personality, attitude, trust-building without sounding corporate (includes atmosphere/vibe)
- סרטון הכרות: who is behind the business, no speech, no "nice to meet you"
- מכירתי: sell without sounding like an ad (includes pain/solution angles)
- טרנדי: use the provided trend patterns below
${contextRows}

Generate 4 strong, original video concepts in the "${videoStyle}" style for this specific business.
Each concept must clearly reflect the "${videoStyle}" style from the first sentence.
Do NOT start any description with: "סרטון שמציג", "נציג את", "נראה את", "לקוחות נהנים".`;

      const { parsed, provider } = await callWithFallback(CONCEPT_GEN_SYSTEM, userPrompt, 0.85);
      const concepts = (parsed.concepts || []).slice(0, 4);

      return Response.json({
        concepts,
        source: "grok_generated",
        provider_log: { provider_used: provider, step_name: "concept", success: true },
      });
    }

    // ── generateOpeningOptions ──────────────────────────────────────────────────
    if (action === "generateOpeningOptions") {
      if (!business || !selectedConcept) {
        return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
      }

      const videoStyle = selectedVideoStyle || "מצחיק";

      // ── HOOK BANK RETRIEVAL ─────────────────────────────────────────────────────
      // Step 1: Get a candidate pool of 30 hooks filtered by style/industry
      // All hooks in our bank have best_for_styles="all" and best_for_industries="all"
      // so we randomize 30 from the full active+locked bank, then let Grok pick 4

      const classifiedIndustry = businessAnalysis?.industry_name || businessAnalysis?.classified_industry || "";
      
      // Pull 30 random candidates from active bank using random source_order ranges
      const totalHooks = 1000;
      const randomOffset = Math.floor(Math.random() * (totalHooks - 30));
      
      let hookCandidates = [];
      try {
        // Get all active locked hooks, randomized via sort, limited to 30
        const allActive = await base44.asServiceRole.entities.LockedHookTemplates.filter(
          { is_active: true, is_locked: true },
          "source_order",
          1000
        );
        // Shuffle and pick 30
        const shuffled = allActive.sort(() => Math.random() - 0.5);
        hookCandidates = shuffled.slice(0, 30);
      } catch (e) {
        console.error("Failed to load hook bank:", e.message);
        hookCandidates = [];
      }

      let openingResult;

      if (hookCandidates.length >= 4) {
        // Use hook bank — send 30 candidates to Grok, it picks 4 best fits
        const templatesForPrompt = hookCandidates.map((h) => ({
          id: h.id,
          hook_id: h.hook_id || "",
          source_order: h.source_order || 0,
          source_category: h.source_category || "",
          hebrew_template: h.hebrew_template || "",
          hook_mechanic: h.hook_mechanic || "",
          placeholder_slots: h.placeholder_slots || "[]",
        }));

        console.log(`Hook bank: sending ${templatesForPrompt.length} candidates to Grok`);

        const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Video style: ${videoStyle}
Industry: ${classifiedIndustry}

Selected concept:
Title: ${selectedConcept.concept_title || selectedConcept.concept_name || ""}
Description: ${selectedConcept.short_description || selectedConcept.core_situation || ""}
Why it works: ${selectedConcept.why_it_works || ""}

Available hook templates from the bank (${templatesForPrompt.length} candidates — choose the 4 best):
${JSON.stringify(templatesForPrompt, null, 2)}

CRITICAL INSTRUCTIONS:
1. Select exactly 4 templates from the list above — no inventing new ones.
2. The hebrew_template is already in Hebrew — do NOT translate it.
3. Fill any (placeholder) slots using the business/concept context.
4. Preserve the exact template wording and structure — only fill placeholders.
5. Return the exact id field as source_hook_template_id for each selection.
6. Each option must use a DIFFERENT template id.
7. source_type must be "hook_bank" for every option.`;

        const { parsed, provider } = await callWithFallback(OPENING_GEN_FROM_TEMPLATES_SYSTEM, userPrompt, 0.75);
        const rawOptions = (parsed.opening_options || []).slice(0, 4);

        // Enforce real metadata from the actual template
        const templateMap = {};
        hookCandidates.forEach(h => { templateMap[h.id] = h; });

        const options = rawOptions.map((opt) => {
          const templateId = opt.source_hook_template_id;
          const matched = templateMap[templateId];
          return {
            opening_line: opt.opening_line || opt.filled_opening_line || "",
            why_it_fits: opt.why_it_fits || "",
            mechanic_tag: opt.mechanic_tag || matched?.hook_mechanic || "",
            source_type: "hook_bank",
            source_hook_template_id: templateId || "",
            hook_id: matched?.hook_id || "",
            source_order: matched?.source_order || 0,
            hebrew_template: matched?.hebrew_template || opt.hebrew_template || "",
            filled_opening_line: opt.filled_opening_line || opt.opening_line || "",
            filled_slots: opt.filled_slots || {},
          };
        });

        openingResult = {
          opening_options: options,
          source: "hook_bank",
          candidates_count: hookCandidates.length,
          provider_log: { provider_used: provider, step_name: "opening_from_bank", success: true },
        };
      } else {
        // Fallback: fewer than 4 active hooks — Grok generates
        console.log(`Hook bank has only ${hookCandidates.length} hooks — using Grok fallback`);

        const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Video style: ${videoStyle}

Selected concept:
Title: ${selectedConcept.concept_title || selectedConcept.concept_name || ""}
Description: ${selectedConcept.short_description || selectedConcept.core_situation || ""}
Why it works: ${selectedConcept.why_it_works || ""}

Generate 4 original opening lines matching this concept and business.
Each must use a different emotional mechanic.
source_type must be "grok_generated" for all.
Do NOT invent fake hook IDs.`;

        const { parsed, provider } = await callWithFallback(OPENING_GEN_GROK_SYSTEM, userPrompt, 0.85);
        const options = (parsed.opening_options || []).slice(0, 4).map(opt => ({
          opening_line: opt.opening_line || "",
          why_it_fits: opt.why_it_fits || "",
          mechanic_tag: opt.mechanic_tag || "",
          source_type: "grok_generated",
          source_hook_template_id: null,
          hook_id: null,
          source_order: null,
          hebrew_template: null,
          filled_opening_line: opt.opening_line || "",
          filled_slots: {},
        }));
        openingResult = {
          opening_options: options,
          source: "grok_generated",
          candidates_count: hookCandidates.length,
          provider_log: { provider_used: provider, step_name: "opening_grok_fallback", success: true },
        };
      }

      return Response.json(openingResult);
    }

    // ── generateCTAOptions ──────────────────────────────────────────────────────
    if (action === "generateCTAOptions") {
      if (!business || !selectedConcept) {
        return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
      }

      const opening = selectedOpening || selectedBody;

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Selected concept:
${JSON.stringify(selectedConcept, null, 2)}

Selected opening line:
${opening ? JSON.stringify(opening, null, 2) : "(not provided)"}

Generate 4 CTA options that are natural, specific to this video, and feel Israeli.
Match the tone of the concept and opening line.`;

      const { parsed, provider } = await callWithFallback(CTA_GEN_SYSTEM, userPrompt, 0.7);

      return Response.json({
        cta_options: parsed.cta_options || [],
        provider_log: { provider_used: provider, step_name: "cta", success: true },
      });
    }

    // ── assembleFinalBrief ──────────────────────────────────────────────────────
    if (action === "assembleFinalBrief") {
      if (!business || !selectedConcept || !selectedCTA) {
        return Response.json({ error: "business, selectedConcept, selectedCTA required" }, { status: 400 });
      }

      const opening = selectedOpening || selectedBody;

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Video style: ${selectedVideoStyle || ""}

Selected concept:
${JSON.stringify(selectedConcept, null, 2)}

Selected opening line:
${opening ? JSON.stringify(opening, null, 2) : "(use concept's natural opening line)"}

Selected CTA:
${JSON.stringify(selectedCTA, null, 2)}

Assemble one complete, clean shooting brief from the selections above.
IMPORTANT: The "hook" field must use the selected opening line exactly (or very close to it).
Do not invent new ideas — use the selected pieces.
Write the full script_text as complete natural spoken Hebrew.
Make it immediately usable for filming.
The field "video_description" is the social media caption — תיאור הסרטון.`;

      const { parsed, provider } = await callWithFallback(FINAL_BRIEF_SYSTEM, userPrompt, 0.6);

      // Map video_description → caption_suggestion for backwards compatibility
      if (parsed.video_description && !parsed.caption_suggestion) {
        parsed.caption_suggestion = parsed.video_description;
      }

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
          category: selectedVideoStyle || "",
          video_style: selectedVideoStyle || "",
          brief_title: parsed.brief_title,
          video_concept: parsed.video_concept,
          hook: parsed.hook,
          script_text: parsed.script_text,
          shot_structure: parsed.shot_structure || [],
          cta: parsed.cta,
          caption_suggestion: parsed.caption_suggestion || parsed.video_description || "",
          production_notes: parsed.production_notes || "",
          visual_must_haves: parsed.visual_must_haves || [],
          risk_notes: parsed.why_it_works || "",
          idea_tags: selectedConcept.idea_tags || selectedConcept.tone_tags || [],
          script_format: parsed.script_format || "person_to_camera",
          adapted_brief: parsed,
          status: "draft",
          video_number: (existingBriefs.length || 0) + 1,
          video_order: (existingBriefs.length || 0) + 1,
        });

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