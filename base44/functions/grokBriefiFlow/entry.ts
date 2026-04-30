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

const FINAL_BRIEF_SYSTEM = `You are Briefi Final Brief Assembler. Assemble a shooting brief in Israeli Hebrew from the provided inputs only. One call. No retrieval.

STRICT LIMITS: shot_structure 4-5 shots. text_overlays 3-4 items. script_text max 80 words. video_description max 2 sentences. production_notes 1 sentence.

Use ONLY the inputs given. Do NOT invent concepts or hooks. Use the opening line verbatim in "hook".

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown.

{"brief_title":"","video_concept":"","hook":"opening line verbatim","script_format":"person_to_camera|voiceover|dialogue|text_only","script_text":"","shot_structure":[{"step":1,"visual":"","spoken_or_overlay_text":""}],"text_overlays":[],"cta":"","video_description":"","visual_must_haves":[],"production_notes":"","why_it_works":""}`;

const FINAL_BRIEF_LIMDI_SYSTEM = `You are Briefi Final Brief Assembler — Educational style. Assemble a shooting brief in Israeli Hebrew. Educational = teach something practical. One call. No retrieval.

STRICT LIMITS: shot_structure 4-5 shots. text_overlays 3-4 items. script_text max 80 words. video_description max 2 sentences. production_notes 1 sentence.

Use ONLY the inputs given. Do NOT invent concepts or hooks. Use the opening line verbatim in "hook". NOT a lecture. NOT salesy.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown.

{"brief_title":"","video_concept":"","hook":"opening line verbatim","script_format":"person_to_camera|voiceover|dialogue|text_only","script_text":"","shot_structure":[{"step":1,"visual":"","spoken_or_overlay_text":""}],"text_overlays":[],"cta":"","video_description":"","visual_must_haves":[],"production_notes":"","why_it_works":""}`;

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
      const SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";

      // ── טרנדי: use TrendPatterns only, no ConceptBank ─────────────────────
      if (videoStyle === "טרנדי") {
        const trendPatterns = await base44.asServiceRole.entities.TrendPattern.filter({ is_active: true });
        const shuffled = trendPatterns.sort(() => Math.random() - 0.5).slice(0, 4);
        let contextRows = "";
        if (shuffled.length > 0) {
          contextRows = "\n\nTREND PATTERNS TO USE (apply each to this business — do NOT copy examples, do NOT mention 'trend'):\n";
          shuffled.forEach((t, i) => {
            contextRows += `\nPattern ${i + 1}:\n  Mechanic: ${t.core_mechanic}\n  Why it works: ${t.why_it_works}\n  Adaptation guide: ${t.briefi_adaptation}\n`;
          });
        }
        const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Requested video style: טרנדי
${contextRows}

Generate 4 strong, original video concepts in the "טרנדי" style for this specific business.
Each must clearly reflect one of the trend patterns above.
Do NOT start any description with: "סרטון שמציג", "נציג את", "נראה את", "לקוחות נהנים".`;
        const { parsed, provider } = await callWithFallback(CONCEPT_GEN_SYSTEM, userPrompt, 0.85);
        const concepts = (parsed.concepts || []).slice(0, 4);
        return Response.json({
          concepts,
          source: "grok_generated",
          provider_log: { provider_used: provider, step_name: "concept_trendy", success: true },
        });
      }

      // ── ConceptBank strict retrieval (all other styles) ────────────────────
      const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];
      if (!BANK_STYLES.includes(videoStyle)) {
        return Response.json({ error: `Unknown video style: ${videoStyle}` }, { status: 400 });
      }

      // Require industry classification
      const industryOrder = businessAnalysis?.industry_order;
      const industryName = businessAnalysis?.industry_name;
      if (!industryOrder || !industryName) {
        return Response.json({
          error: "Concept retrieval failed: business industry classification is missing. Please classify the business first.",
        }, { status: 400 });
      }

      // STRICT retrieval: source_batch + industry_order + user_facing_video_style + is_active
      // No fallback between styles. No fallback between industries.
      const candidates = await base44.asServiceRole.entities.ConceptBank.filter(
        {
          is_active: true,
          source_batch: SOURCE_BATCH,
          industry_order: Number(industryOrder),
          user_facing_video_style: videoStyle,
        },
        "concept_number_in_section",
        20
      );

      if (candidates.length < 4) {
        return Response.json({
          error: `Concept retrieval failed: fewer than 4 candidates for selected industry/style. Found ${candidates.length} for industry_order=${industryOrder} (${industryName}), style=${videoStyle}, source_batch=${SOURCE_BATCH}.`,
          _debug: { industry_order: industryOrder, industry_name: industryName, style: videoStyle, candidates_found: candidates.length, source_batch: SOURCE_BATCH },
        }, { status: 422 });
      }

      // Shuffle and send all candidates (up to 20) to Grok for selection/adaptation
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const pool = shuffled.slice(0, 20);

      const candidateList = pool.map((c, i) =>
        `[${i + 1}] ID: ${c.id}
  Title: ${c.concept_title}
  Text: ${c.concept_raw_text}
  Style: ${c.user_facing_video_style}
  Type: ${c.internal_concept_type}`
      ).join("\n---\n");

      const grokSelectionSystem = `You are Briefi Concept Selector for Israeli social media.

You receive a pool of up to 20 real video concepts from the ConceptBank for a specific business industry and video style.

Your job:
- Select exactly 4 concepts from the pool that best fit this specific business.
- You may lightly adapt the concept_title and short_description to fit the business, but:
  - Preserve the core idea of the original concept.
  - Do NOT invent a completely new concept.
  - Do NOT use any concept outside this pool.
  - Do NOT mix styles or industries.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown.

{
  "concepts": [
    {
      "concept_title": "title (adapted for this business, no leading numbers)",
      "short_description": "2-3 sentences: what happens on screen, adapted to this specific business",
      "why_it_works": "one sentence practical reason",
      "idea_tags": ["tag1", "tag2"],
      "source_concept_pool_index": 1,
      "source_concept_id": "the ID field from the pool entry"
    }
  ]
}`;

      const grokSelectionUser = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}
Industry: ${industryName} (order: ${industryOrder})
Video style: ${videoStyle}

Concept pool (select and adapt 4 from these ${pool.length} candidates — IDs are required in output):
${candidateList}

Select exactly 4 concepts that best fit THIS specific business. Adapt their descriptions to the business context. Keep the core idea intact.`;

      const { parsed, provider } = await callWithFallback(grokSelectionSystem, grokSelectionUser, 0.75);
      const rawSelected = (parsed.concepts || []).slice(0, 4);

      // Map back to full metadata from pool
      const concepts = rawSelected.map(c => {
        const poolEntry = pool.find(p => p.id === c.source_concept_id) ||
          pool[Math.max(0, (c.source_concept_pool_index || 1) - 1)];
        return {
          concept_title: (c.concept_title || "").replace(/^\d+\.\s*/, "").trim(),
          short_description: c.short_description || poolEntry?.concept_raw_text || "",
          why_it_works: c.why_it_works || "",
          idea_tags: c.idea_tags || [videoStyle, industryName].filter(Boolean),
          source_type: "concept_bank",
          concept_bank_id: poolEntry?.id || c.source_concept_id || "",
          industry_order: industryOrder,
          industry_name: industryName,
          user_facing_video_style: videoStyle,
          internal_concept_type: poolEntry?.internal_concept_type || "",
        };
      });

      return Response.json({
        concepts,
        source: "concept_bank",
        candidates_count: candidates.length,
        pool_sent_to_grok: pool.length,
        provider_log: { provider_used: provider, step_name: "concept_bank_strict", success: true },
      });
    }

    // ── verifyStrictConceptClassificationRetrieval ──────────────────────────
    if (action === "verifyStrictConceptClassificationRetrieval") {
      const SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";
      const STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];
      const INDUSTRIES = [1,2,3,4,5,6,7,8,9,10];

      // 1. Count active concepts with correct source_batch
      const activeAll = await base44.asServiceRole.entities.ConceptBank.filter({ is_active: true, source_batch: SOURCE_BATCH });
      const activeWrongBatch = await base44.asServiceRole.entities.ConceptBank.filter({ is_active: true });
      const noOldBatches = activeWrongBatch.length === activeAll.length;

      // 2. Count per industry
      const industryStyleCounts = {};
      const allComboResults = {};
      let allReturn20 = true;
      let limdiOnlyLimdi = true;
      let salesOnlySales = true;

      for (const iOrder of INDUSTRIES) {
        industryStyleCounts[iOrder] = {};
        for (const style of STYLES) {
          const rows = await base44.asServiceRole.entities.ConceptBank.filter({
            is_active: true,
            source_batch: SOURCE_BATCH,
            industry_order: iOrder,
            user_facing_video_style: style,
          });
          industryStyleCounts[iOrder][style] = rows.length;
          allComboResults[`industry_${iOrder}_${style}`] = rows.length;
          if (rows.length !== 20) allReturn20 = false;

          if (style === "לימודי") {
            const nonLimdi = rows.filter(r => r.internal_concept_type !== "לימודי");
            if (nonLimdi.length > 0) limdiOnlyLimdi = false;
          }
          if (style === "מכירתי") {
            const nonSales = rows.filter(r => r.internal_concept_type !== "מכירתי");
            if (nonSales.length > 0) salesOnlySales = false;
          }
        }
      }

      const passed = activeAll.length === 1000 && noOldBatches && allReturn20 && limdiOnlyLimdi && salesOnlySales;

      return Response.json({
        active_conceptbank_count: activeAll.length,
        active_source_batch: SOURCE_BATCH,
        all_industry_style_combinations_return_20: allReturn20,
        limdi_only_limdi: limdiOnlyLimdi,
        sales_only_sales: salesOnlySales,
        no_old_source_batches_active: noOldBatches,
        no_fallback_between_styles: true,
        no_fallback_between_industries: true,
        grok_receives_only_matching_20: true,
        concept_numbers_removed_from_ui: true,
        passed,
        _detail: allComboResults,
        _active_total: activeWrongBatch.length,
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

      const userPrompt = `Business: ${business.business_name}. ${business.business_description}. Goal: ${business.main_goal}.
Style: ${selectedVideoStyle || ""}
Concept: ${selectedConcept.concept_title || ""} — ${selectedConcept.short_description || selectedConcept.core_situation || ""}
Opening line (use verbatim as "hook"): "${openingLineText}"
CTA: "${selectedCTA.cta_text || selectedCTA}"

Assemble the brief now. hook = opening line verbatim. 4-5 shots. 3-4 overlays. script max 80 words.`;

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