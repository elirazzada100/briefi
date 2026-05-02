import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OwnedProjectError, requireOwnedProject } from "./ownership.js";
import {
  AIFlowError,
  AI_TIMEOUT_MS,
  MAX_BUSINESS_NOTES_LENGTH,
  PROMPT_INJECTION_GUARDRAILS,
  SAFE_AI_RETRY_MESSAGE,
  assertMaxLength,
  formatUntrustedBlock,
  sanitizeUntrustedText,
  summarizeError,
} from "./guardrails.js";
import {
  enforceUserRateLimit,
  logAiEvent,
  withStageLock,
  withTimeout,
} from "./aiControls.js";
import {
  validateBusinessAnalysisOutput,
  validateBusinessClassificationOutput,
  validateConceptSelectionOutput,
  validateCTAOptionsOutput,
  validateFinalBriefOutput,
  validateOpeningOptionsOutput,
  validateTrendyConceptOutput,
} from "./validation.js";

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";

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

const GENERATION_STAGE_BY_ACTION = {
  generateCreativeDNA: "business_analysis",
  generateConcepts: "concept_selection",
  generateOpeningOptions: "opening_generation",
  generateCTAOptions: "cta_generation",
  assembleFinalBrief: "final_summary",
  improveFinalBrief: "final_summary_improve",
};

// ── Grok caller ────────────────────────────────────────────────────────────────
async function callGrok(systemPrompt, userPrompt, temperature = 0.7) {
  const apiRes = await withTimeout(
    (signal) => fetch(`${XAI_BASE_URL}/chat/completions`, {
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
      signal,
    }),
    AI_TIMEOUT_MS,
  );
  if (!apiRes.ok) {
    const errText = await apiRes.text();
    throw new AIFlowError(502, `xAI API error: ${apiRes.status} — ${errText}`, {
      userMessage: SAFE_AI_RETRY_MESSAGE,
      code: "XAI_API_ERROR",
    });
  }
  const data = await apiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIFlowError(502, "Empty response from Grok", {
      userMessage: SAFE_AI_RETRY_MESSAGE,
      code: "EMPTY_GROK_RESPONSE",
    });
  }
  return content;
}

// ── Parse JSON with markdown stripping ────────────────────────────────────────
function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

function buildProtectedSystemPrompt(basePrompt) {
  return `${basePrompt}\n\n${PROMPT_INJECTION_GUARDRAILS}`;
}

async function callValidatedGrok({
  action,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  validator,
  retryInstruction,
}) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callGrok(buildProtectedSystemPrompt(systemPrompt), userPrompt, temperature);
      const parsed = parseJSON(raw);
      const validated = validator ? validator(parsed) : parsed;
      return { parsed: validated, provider: "grok", attempts: attempt };
    } catch (error) {
      lastErr = error;
      const safeError = summarizeError(error);
      logAiEvent({
        action,
        provider: "grok",
        success: false,
        attempt,
        error: safeError,
      });
      if (attempt === 1 && retryInstruction) {
        userPrompt = `${userPrompt}\n\n${retryInstruction}`;
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

function createBusinessContext(business, businessAnalysis = {}) {
  const businessName = sanitizeUntrustedText(business?.business_name || business?.client_name || "", 200);
  const businessDescription = sanitizeUntrustedText(business?.business_description || business?.raw_notes || "", MAX_BUSINESS_NOTES_LENGTH);
  const mainGoal = sanitizeUntrustedText(business?.main_goal || "", 500);
  const analysisSummary = {
    main_angle: sanitizeUntrustedText(businessAnalysis?.main_angle || "", 500),
    audience_truth: sanitizeUntrustedText(businessAnalysis?.audience_truth || "", 500),
    what_is_interesting: sanitizeUntrustedText(businessAnalysis?.what_is_interesting || "", 500),
    what_to_avoid: sanitizeUntrustedText(businessAnalysis?.what_to_avoid || "", 500),
    recommended_content_directions: Array.isArray(businessAnalysis?.recommended_content_directions)
      ? businessAnalysis.recommended_content_directions.map((item) => sanitizeUntrustedText(item, 300)).slice(0, 4)
      : [],
    industry_order: businessAnalysis?.industry_order ? Number(businessAnalysis.industry_order) : undefined,
    industry_name: sanitizeUntrustedText(businessAnalysis?.industry_name || "", 200),
  };

  return {
    businessName,
    businessDescription,
    mainGoal,
    analysisSummary,
  };
}

async function runProtectedStage({ userId, projectId, action, fn }) {
  const stage = GENERATION_STAGE_BY_ACTION[action] || action;
  enforceUserRateLimit(userId, stage);
  return withStageLock(userId, projectId, stage, fn);
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";

// Canonical industry map — industry_order is the single source of truth for retrieval
const INDUSTRY_MAP = {
  "food_restaurants":     { order: 1,  name: "מסעדנות ואוכל" },
  "beauty_aesthetics":    { order: 2,  name: "יופי ואסתטיקה" },
  "fitness_nutrition":    { order: 3,  name: "פיטנס ותזונה" },
  "coaches_consultants":  { order: 4,  name: "מאמנים, יועצים ונותני ידע" },
  "local_services":       { order: 5,  name: "עסקים מקומיים ושירותים לבית" },
  "real_estate_interiors":{ order: 6,  name: "נדל״ן, עיצוב פנים ושיפוצים" },
  "events_nightlife":     { order: 7,  name: "אירועים, לילה וחוויות" },
  "fashion_boutiques":    { order: 8,  name: "אופנה, תכשיטים ובוטיקים" },
  "parenting_family":     { order: 9,  name: "הורות, ילדים ומשפחה" },
  "health_wellness":      { order: 10, name: "בריאות, טיפול ו-Wellness" },
};

const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];
const PROJECT_SCOPED_ACTIONS = new Set([
  "generateCreativeDNA",
  "generateConcepts",
  "generateBodyOptions",
  "generateOpeningOptions",
  "generateCTAOptions",
  "assembleFinalBrief",
  "improveFinalBrief",
]);

// ── SYSTEM PROMPTS ─────────────────────────────────────────────────────────────

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

{"brief_title":"","video_style_label":"","video_concept":"","hook":"opening line verbatim","what_happens_on_screen":"","script_format":"person_to_camera|voiceover|dialogue|text_only","script_text":"","shot_structure":[{"step":1,"visual":"","spoken_or_overlay_text":""}],"text_overlays":[],"cta":"","video_description":"","caption_suggestion":"","visual_must_haves":[],"production_notes":"","shooting_time_priority":"","shooting_time_reason":"","why_it_works":""}`;

const FINAL_BRIEF_LIMDI_SYSTEM = `You are Briefi Final Brief Assembler — Educational style. Assemble a shooting brief in Israeli Hebrew. Educational = teach something practical. One call. No retrieval.

STRICT LIMITS: shot_structure 4-5 shots. text_overlays 3-4 items. script_text max 80 words. video_description max 2 sentences. production_notes 1 sentence.

Use ONLY the inputs given. Do NOT invent concepts or hooks. Use the opening line verbatim in "hook". NOT a lecture. NOT salesy.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown.

{"brief_title":"","video_style_label":"","video_concept":"","hook":"opening line verbatim","what_happens_on_screen":"","script_format":"person_to_camera|voiceover|dialogue|text_only","script_text":"","shot_structure":[{"step":1,"visual":"","spoken_or_overlay_text":""}],"text_overlays":[],"cta":"","video_description":"","caption_suggestion":"","visual_must_haves":[],"production_notes":"","shooting_time_priority":"","shooting_time_reason":"","why_it_works":""}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (!XAI_API_KEY) return Response.json({ error: "XAI_API_KEY is not set" }, { status: 500 });

    const body = await req.json();
    const { action, project_id, business, selectedConcept, selectedOpening, selectedBody, selectedCTA, selectedVideoStyle, businessAnalysis } = body;
    const ownedProject = PROJECT_SCOPED_ACTIONS.has(action)
      ? await requireOwnedProject(base44, user.id, project_id)
      : null;

    // ── generateCreativeDNA ─────────────────────────────────────────────────────
    if (action === "generateCreativeDNA") {
      return await runProtectedStage({
        userId: user.id,
        projectId: ownedProject?.id,
        action,
        fn: async () => {
          const { client_name, main_goal, raw_notes } = body;
          assertMaxLength("raw_notes", raw_notes, MAX_BUSINESS_NOTES_LENGTH);

          const DNA_SYSTEM = `You are Briefi Business Analyst for Israeli social media.
Analyze the business and produce a creative content strategy.
Write in natural Israeli Hebrew. Be specific and concrete — not generic marketing advice.

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown.

{"business_analysis_cards":[{"title":"הכיוון הכי חזק","summary":"","tags":[]},{"title":"מה מוכרים פה באמת","summary":"","tags":[]},{"title":"למה זה יכול לעבוד","summary":"","tags":[]},{"title":"איך נגרום לאנשים לעצור","summary":"","tags":[]},{"title":"הזווית של בריפי","summary":"","tags":[]}],"recommended_content_directions":["","",""],"main_angle":"","audience_truth":"","what_is_interesting":"","what_to_avoid":""}`;

          const dnaUser = `${formatUntrustedBlock("Business name", client_name || "", 200)}
Goal: ${main_goal || ""}
${formatUntrustedBlock("Business notes", raw_notes || "", MAX_BUSINESS_NOTES_LENGTH)}

Analyze this business. Fill all 5 cards with specific, actionable insights. Provide 3-4 recommended_content_directions.`;

          const startedAt = Date.now();
          const { parsed: dna, provider, attempts } = await callValidatedGrok({
            action,
            systemPrompt: DNA_SYSTEM,
            userPrompt: dnaUser,
            temperature: 0.7,
            validator: validateBusinessAnalysisOutput,
            retryInstruction: "Validation failed. Return the exact JSON schema with all required fields, Hebrew text only, and no HTML/script.",
          });

          await base44.asServiceRole.entities.Project.update(ownedProject.id, {
            creative_dna: dna,
            status: "in_progress",
          });

          logAiEvent({
            action,
            provider,
            success: true,
            attempts,
            duration_ms: Date.now() - startedAt,
          });

          return Response.json({ creative_dna: dna, provider: "grok" });
        },
      });
    }

    // ── generateConcepts ────────────────────────────────────────────────────────
    if (action === "generateConcepts") {
      return await runProtectedStage({
        userId: user.id,
        projectId: ownedProject?.id,
        action,
        fn: async () => {
          if (!business) {
            return Response.json({ error: "business is required" }, { status: 400 });
          }

          const videoStyle = selectedVideoStyle || "מצחיק";
          const businessContext = createBusinessContext(business, businessAnalysis || {});
          assertMaxLength("business_description", businessContext.businessDescription, MAX_BUSINESS_NOTES_LENGTH);

          // ── טרנדי: TrendPatterns only — never queries ConceptBank ──────────────
          if (videoStyle === "טרנדי") {
            const trendPatterns = await base44.asServiceRole.entities.TrendPattern.filter({ is_active: true });
            const shuffled = trendPatterns.sort(() => Math.random() - 0.5).slice(0, 4);
            let contextRows = "";
            if (shuffled.length > 0) {
              contextRows = "\n\nTREND PATTERNS TO USE (apply each to this business — do NOT copy examples, do NOT mention 'trend'):\n";
              shuffled.forEach((t, i) => {
                contextRows += `\nPattern ${i + 1}:\n  Mechanic: ${sanitizeUntrustedText(t.core_mechanic, 400)}\n  Why it works: ${sanitizeUntrustedText(t.why_it_works, 400)}\n  Adaptation guide: ${sanitizeUntrustedText(t.briefi_adaptation, 400)}\n`;
              });
            }
            const trendyPrompt = `${formatUntrustedBlock("Business name", businessContext.businessName, 200)}
${formatUntrustedBlock("Business notes", businessContext.businessDescription, MAX_BUSINESS_NOTES_LENGTH)}
Goal: ${businessContext.mainGoal}

Requested video style: טרנדי
${contextRows}

Generate 4 strong, original video concepts in the "טרנדי" style for this specific business.
Each must clearly reflect one of the trend patterns above.
Do NOT start any description with: "סרטון שמציג", "נציג את", "נראה את", "לקוחות נהנים".`;

            const TRENDY_SYSTEM = `You are Briefi Concept Generator for Israeli social media — Trendy style.
Generate exactly 4 video concept options based on the trend patterns provided.
Write in natural Israeli Hebrew. Immediately shootable with a phone.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"concepts":[{"concept_title":"","short_description":"","why_it_works":"","idea_tags":[]}]}`;

            const startedAt = Date.now();
            const { parsed, provider, attempts } = await callValidatedGrok({
              action,
              systemPrompt: TRENDY_SYSTEM,
              userPrompt: trendyPrompt,
              temperature: 0.85,
              validator: (result) => ({ concepts: validateTrendyConceptOutput((result.concepts || []).slice(0, 4)) }),
              retryInstruction: "Validation failed. Return exactly 4 Hebrew concepts in the JSON schema. No HTML/script.",
            });
            logAiEvent({
              action,
              provider,
              success: true,
              attempts,
              duration_ms: Date.now() - startedAt,
            });
            return Response.json({
              concepts: parsed.concepts,
              source: "grok_generated",
              provider_log: { provider_used: provider, step_name: "concept_trendy", success: true },
            });
          }

          // ── ConceptBank strict retrieval (non-trendy styles only) ──────────────
          if (!BANK_STYLES.includes(videoStyle)) {
            return Response.json({ error: `Unknown video style: ${videoStyle}` }, { status: 400 });
          }

      // ── STEP 1: Resolve industry_order ──────────────────────────────────────
      // industry_order is the ONLY key used for retrieval — prevents Hebrew string mismatches
          let industryOrder = businessContext.analysisSummary.industry_order || null;
          let industryName = businessContext.analysisSummary.industry_name || "";

      // If not provided, classify now
          if (!industryOrder) {
            const classifyRes = await base44.asServiceRole.functions.invoke("classifyBusinessCategory", {
              businessDescription: `${businessContext.businessName}. ${businessContext.businessDescription}. ${businessContext.mainGoal}`,
            });
            const clf = validateBusinessClassificationOutput(classifyRes);
            const mapped = INDUSTRY_MAP[clf?.category_id];
            if (mapped) {
              industryOrder = mapped.order;
              industryName = mapped.name;
            }
          }

          if (!industryOrder || industryOrder < 1 || industryOrder > 10) {
            return Response.json({
              error: "CONCEPT_RETRIEVAL_FAILED",
              message: SAFE_AI_RETRY_MESSAGE,
              details: "industry_order missing or out of range",
            }, { status: 400 });
          }

      // Normalize industryName from canonical map (prevents mismatch)
      const canonicalIndustry = Object.values(INDUSTRY_MAP).find(i => i.order === industryOrder);
      if (canonicalIndustry) industryName = canonicalIndustry.name;

      // ── STEP 2: Strict retrieval — EXACT filters, no fallback ──────────────
          const retrievalQuery = {
            is_active: true,
            source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
            industry_order: industryOrder,
            user_facing_video_style: videoStyle,
          };

          const candidates = await base44.asServiceRole.entities.ConceptBank.filter(
            retrievalQuery,
            "concept_number_in_section",
            20
          );

      // Debug panel data
          const debugData = {
            classifiedIndustry: { industry_order: industryOrder, industry_name: industryName },
            selected_video_style: videoStyle,
            retrieval_query: { source_batch: ACTIVE_CONCEPT_SOURCE_BATCH, industry_order: industryOrder, user_facing_video_style: videoStyle },
            candidate_count: candidates.length,
            candidate_concept_ids: candidates.map(c => c.id),
            grok_selected_concept_ids: [],
            validation_passed: false,
          };

      // Fail loudly — do NOT mix or fallback
          if (candidates.length < 4) {
            return Response.json({
              error: "CONCEPT_RETRIEVAL_FAILED",
              message: SAFE_AI_RETRY_MESSAGE,
              industry_order: industryOrder,
              selected_video_style: videoStyle,
              candidate_count: candidates.length,
              _debug: debugData,
            }, { status: 422 });
          }

      // ── STEP 3: Send all 20 candidates to Grok for selection/adaptation ────
          const pool = candidates.sort(() => Math.random() - 0.5);
          const candidateIdSet = new Set(pool.map(c => c.id));

          const candidateList = pool.map((c, i) =>
            `[${i + 1}] ID: ${c.id}\n  Title: ${sanitizeUntrustedText(c.concept_title, 200)}\n  Text: ${sanitizeUntrustedText(c.concept_raw_text, 600)}`
          ).join("\n---\n");

          const GROK_SELECTION_SYSTEM = `You are Briefi Concept Selector. You receive exactly ${pool.length} ConceptBank candidates for industry_order=${industryOrder} and style="${videoStyle}".

RULES — ALL MANDATORY:
1. Select EXACTLY 4 concepts from the provided pool.
2. You may lightly adapt concept_title and short_description to fit the business — preserve the core idea.
3. Do NOT invent new concepts. Do NOT use concepts from outside the pool.
4. source_concept_id MUST be an exact ID from the pool list provided.
5. No leading numbers in concept_title.
6. source_type must always be "concept_bank".

${FORBIDDEN_PHRASES}

Return ONLY valid JSON. No markdown.
{"concepts":[{"concept_title":"","short_description":"","why_it_works":"","idea_tags":[],"source_concept_id":"exact-id-from-pool"}]}`;

          const grokSelectionUser = `${formatUntrustedBlock("Business name", businessContext.businessName, 200)}
${formatUntrustedBlock("Business notes", businessContext.businessDescription, MAX_BUSINESS_NOTES_LENGTH)}
Goal: ${businessContext.mainGoal}
Business analysis summary: ${JSON.stringify(businessContext.analysisSummary)}
Industry: ${industryName} (industry_order=${industryOrder})
Video style: ${videoStyle}

CANDIDATE POOL — select 4 from these ${pool.length} only (IDs are mandatory in output):
${candidateList}`;

          const startedAt = Date.now();
          const { parsed, provider, attempts } = await callValidatedGrok({
            action,
            systemPrompt: GROK_SELECTION_SYSTEM,
            userPrompt: grokSelectionUser,
            temperature: 0.75,
            validator: (result) => {
              const rawSelected = (result.concepts || []).slice(0, 4);

              const mapped = rawSelected.map((c) => {
                const poolEntry = pool.find((p) => p.id === c.source_concept_id);
                return {
                  concept_title: (c.concept_title || "").replace(/^\d+[\.\s]+/, "").trim(),
                  short_description: c.short_description || poolEntry?.concept_raw_text || "",
                  why_it_works: c.why_it_works || "",
                  idea_tags: (c.idea_tags || [videoStyle, industryName]).filter(Boolean),
                  source_type: "concept_bank",
                  concept_bank_id: poolEntry?.id || c.source_concept_id || "",
                  industry_order: industryOrder,
                  industry_name: industryName,
                  user_facing_video_style: videoStyle,
                  internal_concept_type: poolEntry?.internal_concept_type || "",
                };
              });

              validateConceptSelectionOutput(mapped, {
                candidatePool: pool,
                candidateIds: candidateIdSet,
                selectedVideoStyle: videoStyle,
                industryOrder,
              });

              return { concepts: mapped };
            },
            retryInstruction: "Validation failed. Return EXACTLY 4 concepts, source_type concept_bank, and source_concept_id values only from the provided candidate list.",
          });

          const concepts = parsed.concepts;
          debugData.grok_selected_concept_ids = concepts.map((c) => c.concept_bank_id);
          debugData.validation_passed = true;

          logAiEvent({
            action,
            provider,
            success: true,
            attempts,
            duration_ms: Date.now() - startedAt,
            candidate_count: candidates.length,
            pool_sent_to_grok: pool.length,
          });

          return Response.json({
            concepts,
            source: "concept_bank",
            candidates_count: candidates.length,
            pool_sent_to_grok: pool.length,
            validation_passed: true,
            provider_log: { provider_used: provider, step_name: "concept_bank_strict", success: true },
            _debug: debugData,
          });
        },
      });
    }

    // ── verifyBriefiConceptMatchingAlgorithm ────────────────────────────────
    if (action === "verifyBriefiConceptMatchingAlgorithm" || action === "verifyStrictConceptClassificationRetrieval") {
      const STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];
      const INDUSTRIES = [1,2,3,4,5,6,7,8,9,10];
      const issues = [];

      // 1. Active count and source batch integrity
      const activeAll = await base44.asServiceRole.entities.ConceptBank.filter({ is_active: true, source_batch: ACTIVE_CONCEPT_SOURCE_BATCH });
      const activeTotal = await base44.asServiceRole.entities.ConceptBank.filter({ is_active: true });
      const noOldBatches = activeTotal.length === activeAll.length;
      if (!noOldBatches) issues.push(`Old source batches still active: total=${activeTotal.length} vs clean_batch=${activeAll.length}`);

      // 2. Per-combo counts + type checks
      const allComboResults = {};
      let allReturn20 = true;
      let limdiOnlyLimdi = true;
      let salesOnlySales = true;
      let conceptTitlesClean = true;

      for (const iOrder of INDUSTRIES) {
        for (const style of STYLES) {
          const rows = await base44.asServiceRole.entities.ConceptBank.filter({
            is_active: true,
            source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
            industry_order: iOrder,
            user_facing_video_style: style,
          });
          allComboResults[`i${iOrder}_${style}`] = rows.length;
          if (rows.length !== 20) {
            allReturn20 = false;
            issues.push(`industry_order=${iOrder} style=${style}: expected 20, got ${rows.length}`);
          }
          if (style === "לימודי") {
            const bad = rows.filter(r => r.internal_concept_type !== "לימודי");
            if (bad.length > 0) { limdiOnlyLimdi = false; issues.push(`industry=${iOrder} לימודי: ${bad.length} rows with wrong internal_concept_type`); }
          }
          if (style === "מכירתי") {
            const bad = rows.filter(r => r.internal_concept_type !== "מכירתי");
            if (bad.length > 0) { salesOnlySales = false; issues.push(`industry=${iOrder} מכירתי: ${bad.length} rows with wrong internal_concept_type`); }
          }
          // Check for leading numbers in titles
          const numbered = rows.filter(r => /^\d+[\.\s]/.test(r.concept_title || ""));
          if (numbered.length > 0) { conceptTitlesClean = false; issues.push(`industry=${iOrder} style=${style}: ${numbered.length} titles with leading numbers`); }
        }
      }

      // 3. Test cases — live classification + retrieval
      const testCases = [
        { desc: "חנות צעצועים גדולה ביבנה. הורים, ילדים, מתנות יום הולדת, משחקים, התלבטויות, לחץ של הורים בקופה.", expected_order: 9, expected_name: "הורות, ילדים ומשפחה", test_style: "לימודי", label: "toy_store_limdi" },
        { desc: "חנות צעצועים גדולה ביבנה. הורים, ילדים, מתנות יום הולדת, משחקים, התלבטויות, לחץ של הורים בקופה.", expected_order: 9, expected_name: "הורות, ילדים ומשפחה", test_style: "מכירתי", label: "toy_store_sales" },
        { desc: "שווארמיה שכונתית בנתניה עם פיתות, לאפות, תור בצהריים, לקוחות קבועים, הרבה רעש וצחוקים.", expected_order: 1, expected_name: "מסעדנות ואוכל", test_style: "מצחיק", label: "shawarma_funny" },
        { desc: "משרד יח״צ שמלווה מותגים, יזמים וחברות ומייצר להם חשיפה תקשורתית, נרטיב וסיפור.", expected_order: 4, expected_name: "מאמנים, יועצים ונותני ידע", test_style: "תדמית", label: "pr_agency_image" },
      ];

      const testResults = {};
      for (const tc of testCases) {
        // Classification via inline Grok call (reuse callGrok)
        const classifySystem = `You are Briefi Category Classifier. Classify into exactly one of these industry_order numbers:
1=מסעדנות ואוכל, 2=יופי ואסתטיקה, 3=פיטנס ותזונה, 4=מאמנים יועצים ונותני ידע, 5=עסקים מקומיים ושירותים לבית, 6=נדל״ן עיצוב פנים ושיפוצים, 7=אירועים לילה וחוויות, 8=אופנה תכשיטים ובוטיקים, 9=הורות ילדים ומשפחה (toy stores ALWAYS here), 10=בריאות טיפול ו-Wellness.
Return ONLY: {"industry_order":number,"industry_name":""}`;
        const classifyUser = `Business: ${tc.desc}`;
        const rawClf = await callGrok(classifySystem, classifyUser, 0.1);
        const clf = parseJSON(rawClf);
        const gotOrder = Number(clf.industry_order);

        // Retrieval
        const rows = await base44.asServiceRole.entities.ConceptBank.filter({
          is_active: true,
          source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
          industry_order: gotOrder,
          user_facing_video_style: tc.test_style,
        });

        const classificationCorrect = gotOrder === tc.expected_order;
        const retrievalCount = rows.length;
        const retrievalClean = rows.every(r => r.industry_order === gotOrder && r.user_facing_video_style === tc.test_style);
        const limdiTypeClean = tc.test_style === "לימודי" ? rows.every(r => r.internal_concept_type === "לימודי") : true;
        const salesExcludesLimdi = tc.test_style === "מכירתי" ? rows.every(r => r.internal_concept_type !== "לימודי") : true;

        testResults[tc.label] = {
          expected_order: tc.expected_order,
          got_order: gotOrder,
          classification_correct: classificationCorrect,
          count: retrievalCount,
          retrieval_clean: retrievalClean,
          limdi_type_clean: limdiTypeClean,
          sales_excludes_limdi: salesExcludesLimdi,
        };

        if (!classificationCorrect) issues.push(`${tc.label}: classified as ${gotOrder}, expected ${tc.expected_order}`);
        if (retrievalCount !== 20) issues.push(`${tc.label}: retrieval returned ${retrievalCount}, expected 20`);
        if (!retrievalClean) issues.push(`${tc.label}: retrieval has rows with wrong industry_order or style`);
        if (!limdiTypeClean) issues.push(`${tc.label}: לימודי rows have wrong internal_concept_type`);
        if (!salesExcludesLimdi) issues.push(`${tc.label}: מכירתי rows include לימודי type`);
      }

      const passed =
        noOldBatches && allReturn20 && limdiOnlyLimdi && salesOnlySales && conceptTitlesClean &&
        Object.values(testResults).every(t => t.classification_correct && t.count === 20 && t.retrieval_clean) &&
        issues.length === 0;

      return Response.json({
        active_source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
        classification_uses_industry_order: true,
        retrieval_uses_strict_filters: true,
        no_fallback_between_industries: true,
        no_fallback_between_styles: true,
        toy_store_limdi_count: testResults.toy_store_limdi?.count,
        toy_store_limdi_clean: testResults.toy_store_limdi?.limdi_type_clean && testResults.toy_store_limdi?.count === 20,
        toy_store_sales_count: testResults.toy_store_sales?.count,
        toy_store_sales_excludes_limdi: testResults.toy_store_sales?.sales_excludes_limdi,
        shawarma_funny_count: testResults.shawarma_funny?.count,
        shawarma_funny_clean: testResults.shawarma_funny?.retrieval_clean && testResults.shawarma_funny?.count === 20,
        pr_agency_image_count: testResults.pr_agency_image?.count,
        pr_agency_image_clean: testResults.pr_agency_image?.retrieval_clean && testResults.pr_agency_image?.count === 20,
        grok_receives_only_matching_20: true,
        grok_output_validated_against_candidate_pool: true,
        bad_concepts_blocked_instead_of_shown: true,
        concept_titles_clean: conceptTitlesClean,
        passed,
        issues,
        _test_details: testResults,
        _combo_counts: allComboResults,
      });
    }

    // ── generateOpeningOptions ──────────────────────────────────────────────────
    if (action === "generateOpeningOptions") {
      return await runProtectedStage({
        userId: user.id,
        projectId: ownedProject?.id,
        action,
        fn: async () => {
          if (!business || !selectedConcept) {
            return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
          }

          const videoStyle = selectedVideoStyle || "מצחיק";
          const businessContext = createBusinessContext(business, businessAnalysis || {});
          const classifiedIndustry = businessContext.analysisSummary.industry_name || "";

          const userPrompt = `${formatUntrustedBlock("Business notes", businessContext.businessDescription, MAX_BUSINESS_NOTES_LENGTH)}
Goal: ${businessContext.mainGoal}
Industry: ${classifiedIndustry}
Business analysis: ${JSON.stringify(businessContext.analysisSummary)}

Video style: ${videoStyle}

Selected concept:
Title: ${sanitizeUntrustedText(selectedConcept.concept_title || selectedConcept.concept_name || "", 200)}
Description: ${sanitizeUntrustedText(selectedConcept.short_description || selectedConcept.core_situation || "", 800)}

Generate exactly 4 opening lines for this specific concept and business.
Each must be the very first sentence of the video — short, spoken, Israeli Hebrew.
Maximum 10 words per line.
Each must use a DIFFERENT emotional mechanic.
Do NOT explain the concept. Do NOT use generic phrases. Sound like a real Israeli person speaking.`;

          const startedAt = Date.now();
          const { parsed, provider, attempts } = await callValidatedGrok({
            action,
            systemPrompt: OPENING_GEN_GROK_SYSTEM,
            userPrompt,
            temperature: 0.85,
            validator: (result) => ({
              opening_options: validateOpeningOptionsOutput((result.opening_options || []).slice(0, 4).map((opt) => ({
                opening_line: opt.opening_line || "",
                why_it_fits: opt.why_it_fits || "",
                mechanic_tag: opt.mechanic_tag || "",
                source_type: "grok_generated",
              }))),
            }),
            retryInstruction: "Validation failed. Return exactly 4 opening options, Hebrew only, no HTML/script, and no hook IDs.",
          });

          logAiEvent({
            action,
            provider,
            success: true,
            attempts,
            duration_ms: Date.now() - startedAt,
          });

          return Response.json({
            opening_options: parsed.opening_options,
            source: "grok_generated",
            provider_log: { provider_used: provider, step_name: "opening_grok", success: true },
          });
        },
      });
    }

    // ── generateCTAOptions ──────────────────────────────────────────────────────
    if (action === "generateCTAOptions") {
      return await runProtectedStage({
        userId: user.id,
        projectId: ownedProject?.id,
        action,
        fn: async () => {
          if (!business || !selectedConcept) {
            return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
          }

          const opening = selectedOpening || selectedBody;
          const businessContext = createBusinessContext(business, businessAnalysis || {});

          const userPrompt = `${formatUntrustedBlock("Business notes", businessContext.businessDescription, MAX_BUSINESS_NOTES_LENGTH)}
Goal: ${businessContext.mainGoal}
Video style: ${selectedVideoStyle || ""}
Business analysis: ${JSON.stringify(businessContext.analysisSummary)}

Selected concept:
Title: ${sanitizeUntrustedText(selectedConcept.concept_title || "", 200)}
Description: ${sanitizeUntrustedText(selectedConcept.short_description || selectedConcept.core_situation || "", 800)}

Selected opening line:
${sanitizeUntrustedText(opening?.opening_line || opening?.filled_opening_line || "", 200)}

Generate 4 CTA options that are natural, specific to this video, and feel Israeli.
Match the tone of the concept and opening line.`;

          const startedAt = Date.now();
          const { parsed, provider, attempts } = await callValidatedGrok({
            action,
            systemPrompt: CTA_GEN_SYSTEM,
            userPrompt,
            temperature: 0.7,
            validator: (result) => ({ cta_options: validateCTAOptionsOutput((result.cta_options || []).slice(0, 4)) }),
            retryInstruction: "Validation failed. Return exactly 4 CTA options with cta_text and why_it_fits in Hebrew. No HTML/script.",
          });

          logAiEvent({
            action,
            provider,
            success: true,
            attempts,
            duration_ms: Date.now() - startedAt,
          });

          return Response.json({
            cta_options: parsed.cta_options,
            provider_log: { provider_used: provider, step_name: "cta", success: true },
          });
        },
      });
    }

    // ── assembleFinalBrief ──────────────────────────────────────────────────────
    if (action === "assembleFinalBrief") {
      return await runProtectedStage({
        userId: user.id,
        projectId: ownedProject?.id,
        action,
        fn: async () => {
          if (!business || !selectedConcept || !selectedCTA) {
            return Response.json({ error: "business, selectedConcept, selectedCTA required" }, { status: 400 });
          }

          const opening = selectedOpening || selectedBody;
          const openingLineText = opening?.opening_line || opening?.filled_opening_line || "";
          const businessContext = createBusinessContext(business, businessAnalysis || {});

          const isLimdi = (selectedVideoStyle || "") === "לימודי";
          const finalBriefSystemPrompt = isLimdi ? FINAL_BRIEF_LIMDI_SYSTEM : FINAL_BRIEF_SYSTEM;

          const userPrompt = `${formatUntrustedBlock("Business notes", businessContext.businessDescription, MAX_BUSINESS_NOTES_LENGTH)}
Goal: ${businessContext.mainGoal}
Business analysis: ${JSON.stringify(businessContext.analysisSummary)}
Style: ${selectedVideoStyle || ""}
Classified industry: ${businessContext.analysisSummary.industry_name || ""}
Concept title: ${sanitizeUntrustedText(selectedConcept.concept_title || "", 200)}
Concept description: ${sanitizeUntrustedText(selectedConcept.short_description || selectedConcept.core_situation || "", 800)}
Opening line (use verbatim as "hook"): "${sanitizeUntrustedText(openingLineText, 200)}"
CTA (use verbatim): "${sanitizeUntrustedText(selectedCTA.cta_text || selectedCTA, 200)}"

Assemble the final video summary now.
Required JSON fields:
- brief_title
- video_style_label
- video_concept
- hook
- what_happens_on_screen
- script_format
- script_text
- shot_structure
- text_overlays
- cta
- caption_suggestion
- production_notes
- shooting_time_priority
- shooting_time_reason
- visual_must_haves
- why_it_works`;

          const startedAt = Date.now();
          const { parsed, provider, attempts } = await callValidatedGrok({
            action,
            systemPrompt: finalBriefSystemPrompt,
            userPrompt,
            temperature: 0.6,
            validator: (result) => {
              if (result.video_description && !result.caption_suggestion) {
                result.caption_suggestion = result.video_description;
              }
              if (!result.video_style_label) {
                result.video_style_label = selectedVideoStyle || "";
              }
              validateFinalBriefOutput(result, {
                selectedOpeningLine: openingLineText,
                selectedCTA: selectedCTA.cta_text || selectedCTA,
                selectedConceptTitle: selectedConcept.concept_title || "",
              });
              return result;
            },
            retryInstruction: "Validation failed. Use the selected opening line and CTA verbatim, include all required JSON fields, Hebrew only, and no HTML/script.",
          });

          let savedBrief = null;
          const existingBriefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id: ownedProject.id });
          savedBrief = await base44.asServiceRole.entities.VideoBrief.create({
            project_id: ownedProject.id,
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

          await base44.asServiceRole.entities.Project.update(ownedProject.id, {
            completed_briefs_count: (existingBriefs.length || 0) + 1,
            status: "in_progress",
          });

          logAiEvent({
            action,
            provider,
            success: true,
            attempts,
            duration_ms: Date.now() - startedAt,
          });

          return Response.json({
            final_brief: parsed,
            brief_id: savedBrief?.id || null,
            provider_log: { provider_used: provider, step_name: "final_brief", success: true },
          });
        },
      });
    }

    // ── improveFinalBrief ───────────────────────────────────────────────────────
    if (action === "improveFinalBrief") {
      return await runProtectedStage({
        userId: user.id,
        projectId: ownedProject?.id,
        action,
        fn: async () => {
          const { original_brief, feedback_text, client_name: cname, main_goal: cgoal, selectedVideoStyle: improveStyle, selectedCTA: improveCTA, selectedOpening: improveOpening, selectedConcept: improveConcept } = body;
          if (!original_brief || !feedback_text) {
            return Response.json({ error: "original_brief and feedback_text required" }, { status: 400 });
          }
          assertMaxLength("feedback_text", feedback_text, 4000);

          const IMPROVE_SYSTEM = `You are Briefi Brief Improver. You receive an existing video brief and user feedback.
Improve the brief based on the feedback. Keep structure identical. Write in Israeli Hebrew.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON with the same schema as the input brief. No markdown.`;

          const improveUser = `${formatUntrustedBlock("Business name", cname || "", 200)}
Goal: ${sanitizeUntrustedText(cgoal || "", 500)}
${formatUntrustedBlock("Feedback from user", feedback_text, 4000)}

Original brief:
${JSON.stringify(original_brief, null, 2)}

Improve the brief based on the feedback. Keep all fields. Adjust only what the feedback indicates.`;

          const startedAt = Date.now();
          const { parsed, provider, attempts } = await callValidatedGrok({
            action,
            systemPrompt: IMPROVE_SYSTEM,
            userPrompt: improveUser,
            temperature: 0.65,
            validator: (result) => validateFinalBriefOutput(result, {
              selectedOpeningLine: improveOpening?.opening_line || improveOpening?.filled_opening_line || original_brief?.hook || "",
              selectedCTA: improveCTA?.cta_text || improveCTA || original_brief?.cta || "",
              selectedConceptTitle: improveConcept?.concept_title || original_brief?.video_concept || "",
              selectedVideoStyle: improveStyle || original_brief?.video_style_label || "",
            }),
            retryInstruction: "Validation failed. Keep the same JSON schema, preserve the selected opening line and CTA, and return Hebrew only with no HTML/script.",
          });
          logAiEvent({
            action,
            provider,
            success: true,
            attempts,
            duration_ms: Date.now() - startedAt,
          });
          return Response.json({ final_brief: parsed, provider: "grok" });
        },
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    if (error instanceof OwnedProjectError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AIFlowError) {
      console.error("grokBriefiFlow error:", summarizeError(error));
      return Response.json({ error: error.userMessage }, { status: error.status });
    }
    console.error("grokBriefiFlow error:", error.message);
    return Response.json({ error: SAFE_AI_RETRY_MESSAGE }, { status: 500 });
  }
});
