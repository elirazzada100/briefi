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

const CONCEPT_GEN_LIMDI_SYSTEM = `You are Briefi Concept Generator for Israeli social media — Educational style.

Generate exactly 4 educational video concept options for the given business.
Each concept must teach something practical that the viewer didn't know.
Each concept should reveal a tip, common mistake, explanation, or surprising fact.

Rules:
- Make it specific to this business — not generic tips anyone could give
- The viewer should understand what they will LEARN from the first sentence
- Avoid sounding like a lecture or an academic paper
- Avoid vague advice like "3 tips for success"
- Each concept must be immediately filmable with a phone
- Do NOT make it salesy
- Write in natural Israeli Hebrew

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "concepts": [
    {
      "concept_title": "short punchy title 2-5 words",
      "short_description": "2-3 sentences: what the viewer learns, what mistake or gap is addressed, how it's shown on screen",
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
- Write in natural, spoken Israeli Hebrew. Max 10 words per line.
- Each line must use a DIFFERENT emotional mechanic.
- Sound like a real Israeli person speaking — NOT a corporate ad, NOT a lecture.
- Be specific to the concept, not generic.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "opening_options": [
    {
      "opening_line": "the actual opening line in Hebrew",
      "why_it_fits": "one short sentence max",
      "mechanic_tag": "short label e.g. 'שאלה', 'ניפוץ ציפיות', 'הצהרה חזקה', 'הומור', 'הפתעה'",
      "source_type": "grok_generated"
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
Write in natural Israeli Hebrew. Keep everything concise and practical.
The brief must be shootable tomorrow with a phone.

Rules:
- shot_structure: 4-6 shots maximum.
- text_overlays: 3-5 overlays maximum.
- script_text: concise, natural spoken Hebrew — not too long.
- Do NOT retrieve or regenerate concepts or hooks.
- Use ONLY the selected inputs provided.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "brief_title": "short title",
  "video_concept": "1-2 sentence concept in Hebrew",
  "hook": "exact opening line — use the selected opening line verbatim",
  "script_format": "person_to_camera | voiceover | dialogue | text_only",
  "script_text": "full spoken script — concise natural Hebrew",
  "shot_structure": [
    { "step": 1, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" }
  ],
  "text_overlays": ["overlay 1", "overlay 2"],
  "cta": "the CTA text",
  "video_description": "social caption in Hebrew",
  "visual_must_haves": ["must-have visual 1"],
  "production_notes": "practical filming notes — 1-2 sentences",
  "why_it_works": "one sentence"
}`;

const FINAL_BRIEF_LIMDI_SYSTEM = `You are Briefi Final Brief Assembler for Israeli social media — Educational style.

Assemble a complete, client-ready shooting brief for an EDUCATIONAL video.
Write in natural Israeli Hebrew. Keep everything concise and practical.
The brief must be shootable tomorrow with a phone.

For educational (לימודי) videos: teach something practical, specific, filmable.
The viewer must understand what they learn from the first sentence.
NOT a lecture. NOT salesy. shot_structure: 4-6 shots. text_overlays: 3-5 max.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown. No explanation.

JSON schema:
{
  "brief_title": "short title",
  "video_concept": "1-2 sentence concept in Hebrew — what the viewer learns",
  "hook": "exact opening line — use the selected opening line verbatim",
  "script_format": "person_to_camera | voiceover | dialogue | text_only",
  "script_text": "spoken educational script — concise natural Hebrew",
  "shot_structure": [
    { "step": 1, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" }
  ],
  "text_overlays": ["key lesson overlay 1", "key lesson overlay 2"],
  "cta": "the CTA text",
  "video_description": "social caption in Hebrew",
  "visual_must_haves": ["must-have visual 1"],
  "production_notes": "practical filming notes — 1-2 sentences",
  "why_it_works": "one sentence"
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

      // ── ConceptBank retrieval for non-Grok styles ──────────────────────────
      // For all non-טרנדי styles, first try to retrieve from ConceptBank
      if (videoStyle !== "טרנדי") {
        const classifiedIndustry = businessAnalysis?.industry_name || businessAnalysis?.classified_industry || "";

        // Map user-facing style → internal_concept_type(s)
        const styleToInternalTypes = {
          "מצחיק": ["מצחיק"],
          "תדמית": ["תדמיתי"],
          "סרטון הכרות": ["היכרותי"],
          "מכירתי": ["מכירתי"],
          "לימודי": ["לימודי"],
        };
        const internalTypes = styleToInternalTypes[videoStyle] || [];

        let bankConcepts = [];
        if (internalTypes.length > 0 && classifiedIndustry) {
          // Primary: match industry + internal type
          for (const itype of internalTypes) {
            const batch = await base44.asServiceRole.entities.ConceptBank.filter(
              { is_active: true, industry_name: classifiedIndustry, internal_concept_type: itype },
              "concept_number_in_section",
              20
            );
            bankConcepts = [...bankConcepts, ...batch];
          }
        }
        if (bankConcepts.length < 4 && internalTypes.length > 0) {
          // Fallback: any industry with matching internal type
          for (const itype of internalTypes) {
            const batch = await base44.asServiceRole.entities.ConceptBank.filter(
              { is_active: true, internal_concept_type: itype },
              "global_concept_number",
              40
            );
            bankConcepts = [...bankConcepts, ...batch];
          }
        }

        if (bankConcepts.length >= 4) {
          // Shuffle and pick 4
          const shuffled = bankConcepts.sort(() => Math.random() - 0.5).slice(0, 4);
          const concepts = shuffled.map(c => ({
            concept_title: c.concept_title || "",
            short_description: c.concept_raw_text || c.concept_description || "",
            why_it_works: c.concept_description || "",
            idea_tags: [videoStyle, c.industry_name].filter(Boolean),
            _source: "concept_bank",
            _concept_bank_id: c.id,
            _global_concept_number: c.global_concept_number,
            _internal_concept_type: c.internal_concept_type,
          }));
          return Response.json({
            concepts,
            source: "concept_bank",
            candidates_count: bankConcepts.length,
            provider_log: { provider_used: "concept_bank", step_name: "concept", success: true },
          });
        }
        console.log(`ConceptBank: only ${bankConcepts.length} candidates for style=${videoStyle}, industry=${classifiedIndustry} — falling back to Grok`);
      }

      // ── Grok generation (טרנדי or fallback) ───────────────────────────────
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

      // Use dedicated לימודי system prompt for educational style
      const systemPrompt = videoStyle === "לימודי" ? CONCEPT_GEN_LIMDI_SYSTEM : CONCEPT_GEN_SYSTEM;

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Requested video style: ${videoStyle}

Style guide:
- מצחיק: skit, funny situation, punchline, something people forward
- תדמית: personality, attitude, trust-building without sounding corporate (includes atmosphere/vibe)
- סרטון הכרות: who is behind the business, no speech, no "nice to meet you"
- מכירתי: sell without sounding like an ad — direct sales angle
- לימודי: teach something practical — tip, common mistake, explanation, surprising fact specific to this business
- טרנדי: use the provided trend patterns below
${contextRows}

Generate 4 strong, original video concepts in the "${videoStyle}" style for this specific business.
Each concept must clearly reflect the "${videoStyle}" style from the first sentence.
Do NOT start any description with: "סרטון שמציג", "נציג את", "נראה את", "לקוחות נהנים".`;

      const { parsed, provider } = await callWithFallback(systemPrompt, userPrompt, 0.85);
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
      const classifiedIndustry = businessAnalysis?.industry_name || businessAnalysis?.classified_industry || "";

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}
Industry: ${classifiedIndustry}

Video style: ${videoStyle}

Selected concept:
Title: ${selectedConcept.concept_title || selectedConcept.concept_name || ""}
Description: ${selectedConcept.short_description || selectedConcept.core_situation || ""}

Generate exactly 4 opening lines for this specific concept and business.
Each must be the very first sentence of the video — short, spoken, Israeli Hebrew.
Maximum 10 words per line.
Each must use a DIFFERENT emotional mechanic.
Do NOT explain the concept. Do NOT use generic phrases. Sound like a real Israeli person speaking.`;

      const { parsed, provider } = await callWithFallback(OPENING_GEN_GROK_SYSTEM, userPrompt, 0.85);
      const options = (parsed.opening_options || []).slice(0, 4).map(opt => ({
        opening_line: opt.opening_line || "",
        why_it_fits: opt.why_it_fits || "",
        mechanic_tag: opt.mechanic_tag || "",
        source_type: "grok_generated",
      }));

      return Response.json({
        opening_options: options,
        source: "grok_generated",
        provider_log: { provider_used: provider, step_name: "opening_grok", success: true },
      });
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
      // Support both new schema (opening_line) and old schema (filled_opening_line)
      const openingLineText = opening?.opening_line || opening?.filled_opening_line || "";

      const isLimdi = (selectedVideoStyle || "") === "לימודי";
      const finalBriefSystemPrompt = isLimdi ? FINAL_BRIEF_LIMDI_SYSTEM : FINAL_BRIEF_SYSTEM;

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Video style: ${selectedVideoStyle || ""}

Selected concept:
Title: ${selectedConcept.concept_title || selectedConcept.concept_name || ""}
Description: ${selectedConcept.short_description || selectedConcept.core_situation || ""}

Selected opening line (use verbatim in "hook" field):
"${openingLineText}"

Selected CTA:
"${selectedCTA.cta_text || selectedCTA}"

Assemble one complete, concise shooting brief using ONLY the above selected inputs.
- "hook" field = the selected opening line verbatim.
- 4-6 shots only.
- 3-5 text overlays only.
- script_text should be concise spoken Hebrew.
- Do NOT regenerate concepts or hooks.`;

      const { parsed, provider } = await callWithFallback(finalBriefSystemPrompt, userPrompt, 0.6);

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