import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = "gpt-4.1-mini-2025-04-14";

// ── Core OpenAI caller ────────────────────────────────────────────────────────
async function callOpenAI(systemPrompt, userPrompt, temperature = 0.7, jsonMode = true) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!apiRes.ok) {
    const errText = await apiRes.text();
    throw new Error(`OpenAI API error: ${apiRes.status} — ${errText}`);
  }
  const data = await apiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}

// ── Parse JSON with markdown stripping ────────────────────────────────────────
function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── OpenAI call + parse (returns parsed object) ────────────────────────────────
async function callOpenAIParsed(systemPrompt, userPrompt, temperature = 0.7) {
  const raw = await callOpenAI(systemPrompt, userPrompt, temperature, true);
  return parseJSON(raw);
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";

const INDUSTRY_MAP = {
  "food_restaurants":      { order: 1,  name: "מסעדנות ואוכל" },
  "beauty_aesthetics":     { order: 2,  name: "יופי ואסתטיקה" },
  "fitness_nutrition":     { order: 3,  name: "פיטנס ותזונה" },
  "coaches_consultants":   { order: 4,  name: "מאמנים, יועצים ונותני ידע" },
  "local_services":        { order: 5,  name: "עסקים מקומיים ושירותים לבית" },
  "real_estate_interiors": { order: 6,  name: "נדל״ן, עיצוב פנים ושיפוצים" },
  "events_nightlife":      { order: 7,  name: "אירועים, לילה וחוויות" },
  "fashion_boutiques":     { order: 8,  name: "אופנה, תכשיטים ובוטיקים" },
  "parenting_family":      { order: 9,  name: "הורות, ילדים ומשפחה" },
  "health_wellness":       { order: 10, name: "בריאות, טיפול ו-Wellness" },
};

const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];

const FORBIDDEN_PHRASES = `Forbidden phrases — NEVER use:
"חוויה בלתי נשכחת", "בואו ליהנות", "המקום המושלם", "עקבו לעוד", "אתם חייבים לראות",
"חוויה מדהימה", "שירות מקצועי ואיכותי", "תוצאה מושלמת", "אווירה קסומה", "יחס אישי ומקצועי",
"סרטון שמציג", "נציג את", "נראה את", "קריאייטיב" (as job title — use הצלם/בעל העסק/מנהל הסושיאל).`;

// ── Classification ─────────────────────────────────────────────────────────────
const CLASSIFY_SYSTEM = `You are a business category classifier. Classify the business into exactly one of these 10 categories.
Return ONLY valid JSON: {"industry_order": <number 1-10>, "industry_name": "<exact name below>"}

1 = מסעדנות ואוכל
2 = יופי ואסתטיקה
3 = פיטנס ותזונה
4 = מאמנים, יועצים ונותני ידע
5 = עסקים מקומיים ושירותים לבית
6 = נדל״ן, עיצוב פנים ושיפוצים
7 = אירועים, לילה וחוויות
8 = אופנה, תכשיטים ובוטיקים
9 = הורות, ילדים ומשפחה
10 = בריאות, טיפול ו-Wellness

Rules:
- Toy stores, games, kids products → 9
- Restaurants, cafes, food → 1
- Hair, nails, beauty clinics → 2
- Gyms, personal trainers, nutrition → 3
- Coaches, consultants, course creators → 4
- Plumbers, electricians, cleaners, home services → 5
- Real estate, interior design, renovations → 6
- Events, weddings, DJs, nightlife → 7
- Fashion, jewelry, clothing boutiques → 8
- Therapists, physiotherapy, wellness → 10`;

async function classifyWithOpenAI(businessDescription) {
  const result = await callOpenAIParsed(CLASSIFY_SYSTEM, `Business: ${businessDescription}`, 0.1);
  const order = Number(result.industry_order);
  const canonical = Object.values(INDUSTRY_MAP).find(i => i.order === order);
  if (!canonical || order < 1 || order > 10) {
    throw new Error(`Invalid industry_order from classification: ${result.industry_order}`);
  }
  return { industry_order: order, industry_name: canonical.name };
}

// ── SYSTEM PROMPTS ─────────────────────────────────────────────────────────────

const DNA_SYSTEM = `You are Briefi Business Analyst for Israeli social media.
Analyze the business and produce a focused content strategy. Write in natural Israeli Hebrew. Be specific — not generic marketing.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"business_analysis_cards":[{"title":"הכיוון הכי חזק","summary":"","tags":[]},{"title":"מה מוכרים פה באמת","summary":"","tags":[]},{"title":"למה זה יכול לעבוד","summary":"","tags":[]},{"title":"איך נגרום לאנשים לעצור","summary":"","tags":[]},{"title":"הזווית של בריפי","summary":"","tags":[]}],"recommended_content_directions":["","",""],"main_angle":"","audience_truth":"","what_is_interesting":"","what_to_avoid":""}`;

const TRENDY_SYSTEM = `You are Briefi Concept Generator for Israeli social media — Trendy style.
Generate exactly 4 video concept options based on the trend patterns provided.
Write in natural Israeli Hebrew. Immediately shootable with a phone. Sound like a real person, not a marketer.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"concepts":[{"concept_title":"","short_description":"","why_it_works":"","idea_tags":[]}]}`;

const OPENING_SYSTEM = `You are Briefi Opening Line Generator for Israeli social media.
Generate exactly 4 opening lines for this video concept and business.
Rules:
- First sentence of the video — grabs attention immediately.
- Natural spoken Israeli Hebrew. Max 10 words per line.
- Each line uses a DIFFERENT emotional mechanic.
- Sounds like a real Israeli person, NOT a corporate ad.
- Specific to this concept.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"opening_options":[{"opening_line":"","why_it_fits":"","mechanic_tag":"","source_type":"openai_generated"}]}`;

const CTA_SYSTEM = `You are Briefi CTA Generator for Israeli social media.
Generate exactly 4 CTA options. Natural Israeli Hebrew — not corporate, not American, not generic.
Rules: no "עקבו לעוד", no "שיתפו עם חברים" as only option. Include variety: direct, soft, save/share, DM.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"cta_options":[{"cta_type":"ישיר | רך | שמירה / שיתוף | פנייה / הודעה","cta_text":"","why_it_fits":""}]}`;

const FINAL_BRIEF_SYSTEM = `You are Briefi Final Brief Assembler. Build a practical shooting brief in Israeli Hebrew from the inputs only.

STRICT RULES:
- hook = opening line verbatim (do NOT change it)
- script_text: max 60 words, spoken naturally, not a lecture
- shot_structure: exactly 4 shots, each with a clear visual action
- text_overlays: 2-3 short on-screen texts
- production_notes: 1 sentence max
- video_description: 1 sentence max (for caption)
- Do NOT invent anything not in the inputs
- Do NOT add strategy, analysis, or explanations
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"brief_title":"","video_concept":"","hook":"","script_format":"person_to_camera|voiceover|dialogue|text_only","script_text":"","shot_structure":[{"step":1,"visual":"","spoken_or_overlay_text":""}],"text_overlays":[],"cta":"","video_description":"","visual_must_haves":[],"production_notes":"","why_it_works":""}`;

const FINAL_BRIEF_LIMDI_SYSTEM = `You are Briefi Final Brief Assembler — Educational style. Build a practical shooting brief in Israeli Hebrew from the inputs only.

STRICT RULES:
- Educational = teach something practical and useful
- hook = opening line verbatim (do NOT change it)
- script_text: max 60 words, teach one clear thing
- shot_structure: exactly 4 shots
- text_overlays: 2-3 short texts
- production_notes: 1 sentence max
- NOT a lecture. NOT salesy.
- Do NOT invent anything not in the inputs
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"brief_title":"","video_concept":"","hook":"","script_format":"person_to_camera|voiceover|dialogue|text_only","script_text":"","shot_structure":[{"step":1,"visual":"","spoken_or_overlay_text":""}],"text_overlays":[],"cta":"","video_description":"","visual_must_haves":[],"production_notes":"","why_it_works":""}`;

const IMPROVE_SYSTEM = `You are Briefi Brief Improver. You receive an existing video brief and user feedback.
Improve the brief based on the feedback. Keep structure identical. Write in Israeli Hebrew. Be concise.
${FORBIDDEN_PHRASES}
Return ONLY valid JSON with the same schema as the input brief. No markdown.`;

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!OPENAI_API_KEY) return Response.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });

    const body = await req.json();
    const { action, project_id, business, selectedConcept, selectedOpening, selectedBody, selectedCTA, selectedVideoStyle, businessAnalysis } = body;

    // ── generateCreativeDNA ─────────────────────────────────────────────────────
    if (action === "generateCreativeDNA") {
      const { project_id: pid, client_name, main_goal, raw_notes } = body;
      const t0 = Date.now();

      const dnaUser = `Business name: ${client_name || ""}
Goal: ${main_goal || ""}
Notes: ${raw_notes || ""}

Analyze this business. Fill all 5 cards with specific, actionable insights in Hebrew. Provide 3-4 recommended_content_directions.`;

      const dna = await callOpenAIParsed(DNA_SYSTEM, dnaUser, 0.7);
      const totalMs = Date.now() - t0;
      console.log(`[dna] total=${totalMs}ms`);

      if (pid) {
        await base44.asServiceRole.entities.Project.update(pid, {
          creative_dna: dna,
          status: "in_progress",
        });
      }

      return Response.json({ creative_dna: dna, provider: "openai", _debug: { total_ms: totalMs } });
    }

    // ── generateConcepts ────────────────────────────────────────────────────────
    if (action === "generateConcepts") {
      if (!business) return Response.json({ error: "business is required" }, { status: 400 });
      const t0 = Date.now();
      const videoStyle = selectedVideoStyle || "מצחיק";

      // ── טרנדי: TrendPatterns only ──────────────────────────────────────────
      if (videoStyle === "טרנדי") {
        const trendPatterns = await base44.asServiceRole.entities.TrendPattern.filter({ is_active: true });
        const shuffled = trendPatterns.sort(() => Math.random() - 0.5).slice(0, 4);
        let contextRows = "";
        if (shuffled.length > 0) {
          contextRows = "\n\nTREND PATTERNS TO USE (apply each to this business — do NOT copy examples):\n";
          shuffled.forEach((t, i) => {
            contextRows += `\nPattern ${i + 1}:\n  Mechanic: ${t.core_mechanic}\n  Why it works: ${t.why_it_works}\n  Adaptation: ${t.briefi_adaptation}\n`;
          });
        }
        const trendyUser = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}
${contextRows}
Generate 4 strong original video concepts in "טרנדי" style for this business. Each reflects one trend pattern. Do NOT start with: "סרטון שמציג", "נציג את", "נראה את".`;

        const parsed = await callOpenAIParsed(TRENDY_SYSTEM, trendyUser, 0.85);
        const concepts = (parsed.concepts || []).slice(0, 4);
        const totalMs = Date.now() - t0;
        console.log(`[concepts_trendy] total=${totalMs}ms`);
        return Response.json({
          concepts,
          source: "openai_generated",
          provider_log: { provider_used: "openai", step_name: "concept_trendy", success: true },
          _debug: { total_ms: totalMs },
        });
      }

      // ── ConceptBank strict retrieval ────────────────────────────────────────
      if (!BANK_STYLES.includes(videoStyle)) {
        return Response.json({ error: `Unknown video style: ${videoStyle}` }, { status: 400 });
      }

      let industryOrder = businessAnalysis?.industry_order ? Number(businessAnalysis.industry_order) : null;
      let industryName = businessAnalysis?.industry_name || "";
      let classificationMs = 0;

      // Normalize from canonical map if already provided
      if (industryOrder) {
        const canonical = Object.values(INDUSTRY_MAP).find(i => i.order === industryOrder);
        if (canonical) industryName = canonical.name;
      }

      let candidates;

      if (industryOrder && industryOrder >= 1 && industryOrder <= 10) {
        const t1 = Date.now();
        candidates = await base44.asServiceRole.entities.ConceptBank.filter(
          { is_active: true, source_batch: ACTIVE_CONCEPT_SOURCE_BATCH, industry_order: industryOrder, user_facing_video_style: videoStyle },
          "concept_number_in_section", 20
        );
        console.log(`[concepts] skipped_classification, db_query=${Date.now()-t1}ms`);
      } else {
        const t1 = Date.now();
        let clf;
        try {
          clf = await classifyWithOpenAI(`${business.business_name}. ${business.business_description}. ${business.main_goal}`);
        } catch (err) {
          console.error("Classification failed:", err.message);
          return Response.json({ error: "CONCEPT_RETRIEVAL_FAILED", message: "לא הצלחנו לסווג את העסק. נסו שוב.", details: err.message }, { status: 400 });
        }
        classificationMs = Date.now() - t1;
        industryOrder = clf.industry_order;
        industryName = clf.industry_name;

        const t2 = Date.now();
        candidates = await base44.asServiceRole.entities.ConceptBank.filter(
          { is_active: true, source_batch: ACTIVE_CONCEPT_SOURCE_BATCH, industry_order: industryOrder, user_facing_video_style: videoStyle },
          "concept_number_in_section", 20
        );
        console.log(`[concepts] classify=${classificationMs}ms, db_query=${Date.now()-t2}ms`);
      }

      if (!industryOrder || industryOrder < 1 || industryOrder > 10) {
        return Response.json({ error: "CONCEPT_RETRIEVAL_FAILED", message: "לא הצלחנו לסווג את העסק. נסו שוב." }, { status: 400 });
      }

      const debugData = {
        classifiedIndustry: { industry_order: industryOrder, industry_name: industryName },
        selected_video_style: videoStyle,
        candidate_count: candidates.length,
        classification_ms: classificationMs,
        validation_passed: false,
      };

      if (candidates.length < 4) {
        return Response.json({
          error: "CONCEPT_RETRIEVAL_FAILED",
          message: "משהו השתבש בשליפת הרעיונות. נסו שוב בעוד רגע.",
          _debug: { ...debugData, candidate_count: candidates.length },
        }, { status: 422 });
      }

      const pool = candidates.sort(() => Math.random() - 0.5);
      const candidateIdSet = new Set(pool.map(c => c.id));
      const candidateList = pool.map((c, i) =>
        `[${i + 1}] ID: ${c.id}\n  Title: ${c.concept_title}\n  Text: ${c.concept_raw_text}`
      ).join("\n---\n");

      const SELECTION_SYSTEM = `You are Briefi Concept Selector. You receive ${pool.length} ConceptBank candidates for industry_order=${industryOrder} and style="${videoStyle}".
RULES — ALL MANDATORY:
1. Select EXACTLY 4 concepts from the provided pool.
2. You may lightly adapt concept_title and short_description to fit the business — preserve the core idea.
3. Do NOT invent new concepts. Do NOT use concepts from outside the pool.
4. source_concept_id MUST be an exact ID from the pool list.
5. No leading numbers in concept_title.
6. source_type must always be "concept_bank".
${FORBIDDEN_PHRASES}
Return ONLY valid JSON. No markdown.
{"concepts":[{"concept_title":"","short_description":"","why_it_works":"","idea_tags":[],"source_concept_id":"exact-id-from-pool"}]}`;

      const selectionUser = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}
Industry: ${industryName} (industry_order=${industryOrder})
Video style: ${videoStyle}

CANDIDATE POOL — select 4 from these ${pool.length} only (IDs mandatory in output):
${candidateList}`;

      async function runSelectionAndValidate(userPrompt) {
        const parsed = await callOpenAIParsed(SELECTION_SYSTEM, userPrompt, 0.7);
        const rawSelected = (parsed.concepts || []).slice(0, 4);
        const mapped = rawSelected.map(c => {
          const poolEntry = pool.find(p => p.id === c.source_concept_id);
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
        const validationErrors = [];
        if (mapped.length !== 4) validationErrors.push(`Expected 4 concepts, got ${mapped.length}`);
        mapped.forEach((c, i) => {
          if (!c.concept_bank_id || !candidateIdSet.has(c.concept_bank_id)) validationErrors.push(`[${i}] concept_bank_id "${c.concept_bank_id}" not in pool`);
          if (c.industry_order !== industryOrder) validationErrors.push(`[${i}] wrong industry_order`);
        });
        return { mapped, validationErrors };
      }

      const tSelection = Date.now();
      let { mapped: concepts, validationErrors } = await runSelectionAndValidate(selectionUser);
      const selectionMs = Date.now() - tSelection;

      if (validationErrors.length > 0) {
        const retryUser = `${selectionUser}\n\nVALIDATION FAILED: ${validationErrors.join("; ")}\nUse only IDs from the pool. Return EXACTLY 4 with valid source_concept_id.`;
        const retry = await runSelectionAndValidate(retryUser);
        if (retry.validationErrors.length === 0) {
          concepts = retry.mapped;
        } else {
          return Response.json({
            error: "OPENAI_CONCEPT_SELECTION_VALIDATION_FAILED",
            message: "משהו השתבש בשליפת הרעיונות. נסו שוב בעוד רגע.",
            validation_errors: retry.validationErrors,
          }, { status: 422 });
        }
      }

      const totalMs = Date.now() - t0;
      debugData.validation_passed = true;
      debugData.openai_selection_ms = selectionMs;
      debugData.total_ms = totalMs;
      console.log(`[concepts] classify=${classificationMs}ms, selection=${selectionMs}ms, total=${totalMs}ms`);

      return Response.json({
        concepts,
        source: "concept_bank",
        candidates_count: candidates.length,
        pool_sent_to_openai: pool.length,
        validation_passed: true,
        provider_log: { provider_used: "openai", step_name: "concept_bank_strict", success: true },
        _debug: debugData,
      });
    }

    // ── verifyBriefiConceptMatchingAlgorithm ────────────────────────────────
    if (action === "verifyBriefiConceptMatchingAlgorithm" || action === "verifyStrictConceptClassificationRetrieval") {
      const STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];
      const INDUSTRIES = [1,2,3,4,5,6,7,8,9,10];
      const issues = [];

      const activeAll = await base44.asServiceRole.entities.ConceptBank.filter({ is_active: true, source_batch: ACTIVE_CONCEPT_SOURCE_BATCH });
      const activeTotal = await base44.asServiceRole.entities.ConceptBank.filter({ is_active: true });
      const noOldBatches = activeTotal.length === activeAll.length;
      if (!noOldBatches) issues.push(`Old source batches still active: total=${activeTotal.length} vs clean_batch=${activeAll.length}`);

      const allComboResults = {};
      let allReturn20 = true;
      let limdiOnlyLimdi = true;
      let salesOnlySales = true;
      let conceptTitlesClean = true;

      for (const iOrder of INDUSTRIES) {
        for (const style of STYLES) {
          const rows = await base44.asServiceRole.entities.ConceptBank.filter({
            is_active: true, source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
            industry_order: iOrder, user_facing_video_style: style,
          });
          allComboResults[`i${iOrder}_${style}`] = rows.length;
          if (rows.length !== 20) { allReturn20 = false; issues.push(`i${iOrder} ${style}: expected 20, got ${rows.length}`); }
          if (style === "לימודי") {
            const bad = rows.filter(r => r.internal_concept_type !== "לימודי");
            if (bad.length > 0) { limdiOnlyLimdi = false; issues.push(`i${iOrder} לימודי: ${bad.length} wrong type`); }
          }
          if (style === "מכירתי") {
            const bad = rows.filter(r => r.internal_concept_type !== "מכירתי");
            if (bad.length > 0) { salesOnlySales = false; issues.push(`i${iOrder} מכירתי: ${bad.length} wrong type`); }
          }
          const numbered = rows.filter(r => /^\d+[\.\s]/.test(r.concept_title || ""));
          if (numbered.length > 0) { conceptTitlesClean = false; issues.push(`i${iOrder} ${style}: ${numbered.length} numbered titles`); }
        }
      }

      // Test cases — use OpenAI classification
      const testCases = [
        { desc: "חנות צעצועים גדולה ביבנה. הורים, ילדים, מתנות יום הולדת, משחקים.", expected_order: 9, test_style: "לימודי", label: "toy_store_limdi" },
        { desc: "חנות צעצועים גדולה ביבנה. הורים, ילדים, מתנות יום הולדת, משחקים.", expected_order: 9, test_style: "מכירתי", label: "toy_store_sales" },
        { desc: "שווארמיה שכונתית בנתניה עם פיתות, לאפות, תור בצהריים, לקוחות קבועים.", expected_order: 1, test_style: "מצחיק", label: "shawarma_funny" },
        { desc: "משרד יח״צ שמלווה מותגים, יזמים וחברות ומייצר להם חשיפה תקשורתית.", expected_order: 4, test_style: "תדמית", label: "pr_agency_image" },
      ];

      const testResults = {};
      for (const tc of testCases) {
        let gotOrder = 0;
        try {
          const clf = await classifyWithOpenAI(tc.desc);
          gotOrder = clf.industry_order;
        } catch(e) { issues.push(`${tc.label}: classification error — ${e.message}`); }

        const rows = await base44.asServiceRole.entities.ConceptBank.filter({
          is_active: true, source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
          industry_order: gotOrder, user_facing_video_style: tc.test_style,
        });

        const classificationCorrect = gotOrder === tc.expected_order;
        const retrievalClean = rows.every(r => r.industry_order === gotOrder && r.user_facing_video_style === tc.test_style);
        const limdiTypeClean = tc.test_style === "לימודי" ? rows.every(r => r.internal_concept_type === "לימודי") : true;
        const salesExcludesLimdi = tc.test_style === "מכירתי" ? rows.every(r => r.internal_concept_type !== "לימודי") : true;

        testResults[tc.label] = { expected_order: tc.expected_order, got_order: gotOrder, classification_correct: classificationCorrect, count: rows.length, retrieval_clean: retrievalClean, limdi_type_clean: limdiTypeClean, sales_excludes_limdi: salesExcludesLimdi };
        if (!classificationCorrect) issues.push(`${tc.label}: classified as ${gotOrder}, expected ${tc.expected_order}`);
        if (rows.length !== 20) issues.push(`${tc.label}: got ${rows.length} rows, expected 20`);
        if (!retrievalClean) issues.push(`${tc.label}: retrieval has wrong rows`);
      }

      const passed = noOldBatches && allReturn20 && limdiOnlyLimdi && salesOnlySales && conceptTitlesClean &&
        Object.values(testResults).every(t => t.classification_correct && t.count === 20 && t.retrieval_clean) &&
        issues.length === 0;

      return Response.json({
        active_source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
        active_provider: "openai",
        passed, issues,
        _test_details: testResults,
        _combo_counts: allComboResults,
      });
    }

    // ── generateOpeningOptions ──────────────────────────────────────────────────
    if (action === "generateOpeningOptions") {
      if (!business || !selectedConcept) {
        return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
      }
      const t0 = Date.now();
      const videoStyle = selectedVideoStyle || "מצחיק";
      const classifiedIndustry = businessAnalysis?.industry_name || "";

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}
Industry: ${classifiedIndustry}
Video style: ${videoStyle}

Selected concept:
Title: ${selectedConcept.concept_title || selectedConcept.concept_name || ""}
Description: ${selectedConcept.short_description || selectedConcept.core_situation || ""}

Generate exactly 4 opening lines. Each is the very first sentence of the video. Max 10 words per line. Each uses a DIFFERENT emotional mechanic. Spoken natural Israeli Hebrew. No generic phrases.`;

      const parsed = await callOpenAIParsed(OPENING_SYSTEM, userPrompt, 0.85);
      const options = (parsed.opening_options || []).slice(0, 4).map(opt => ({
        opening_line: opt.opening_line || "",
        why_it_fits: opt.why_it_fits || "",
        mechanic_tag: opt.mechanic_tag || "",
        source_type: "openai_generated",
      }));
      const totalMs = Date.now() - t0;
      console.log(`[opening] total=${totalMs}ms`);

      return Response.json({
        opening_options: options,
        source: "openai_generated",
        provider_log: { provider_used: "openai", step_name: "opening", success: true },
        _debug: { total_ms: totalMs },
      });
    }

    // ── generateCTAOptions ──────────────────────────────────────────────────────
    if (action === "generateCTAOptions") {
      if (!business || !selectedConcept) {
        return Response.json({ error: "business and selectedConcept required" }, { status: 400 });
      }
      const t0 = Date.now();
      const opening = selectedOpening || selectedBody;

      const userPrompt = `Business:
Name: ${business.business_name}
Description: ${business.business_description}
Goal: ${business.main_goal}

Concept: ${selectedConcept.concept_title || ""} — ${selectedConcept.short_description || ""}
Opening line: ${opening?.opening_line || opening?.filled_opening_line || "(not provided)"}

Generate 4 CTA options that are natural, specific to this video, and feel Israeli. Match the tone.`;

      const parsed = await callOpenAIParsed(CTA_SYSTEM, userPrompt, 0.7);
      const totalMs = Date.now() - t0;
      console.log(`[cta] total=${totalMs}ms`);

      return Response.json({
        cta_options: parsed.cta_options || [],
        provider_log: { provider_used: "openai", step_name: "cta", success: true },
        _debug: { total_ms: totalMs },
      });
    }

    // ── assembleFinalBrief ──────────────────────────────────────────────────────
    if (action === "assembleFinalBrief") {
      if (!business || !selectedConcept || !selectedCTA) {
        return Response.json({ error: "business, selectedConcept, selectedCTA required" }, { status: 400 });
      }
      const t0 = Date.now();
      const opening = selectedOpening || selectedBody;
      const openingLineText = opening?.opening_line || opening?.filled_opening_line || "";
      const isLimdi = (selectedVideoStyle || "") === "לימודי";

      const userPrompt = `Business: ${business.business_name}. ${business.business_description}. Goal: ${business.main_goal}.
Style: ${selectedVideoStyle || ""}
Concept: ${selectedConcept.concept_title || ""} — ${selectedConcept.short_description || selectedConcept.core_situation || ""}
Opening line (use verbatim as "hook"): "${openingLineText}"
CTA: "${selectedCTA.cta_text || selectedCTA}"

Build the brief now. hook = opening line verbatim. 4 shots. 2-3 overlays. script max 60 words.`;

      const parsed = await callOpenAIParsed(isLimdi ? FINAL_BRIEF_LIMDI_SYSTEM : FINAL_BRIEF_SYSTEM, userPrompt, 0.6);

      if (parsed.video_description && !parsed.caption_suggestion) {
        parsed.caption_suggestion = parsed.video_description;
      }

      const required = ["brief_title", "video_concept", "hook", "script_text", "cta"];
      const missing = required.filter(f => !parsed[f]);
      if (missing.length > 0) {
        return Response.json({ error: `Incomplete brief — missing: ${missing.join(", ")}. נסו שוב.`, partial: parsed }, { status: 422 });
      }

      const tSave = Date.now();
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

      const totalMs = Date.now() - t0;
      const saveMs = Date.now() - tSave;
      console.log(`[finalbrief] total=${totalMs}ms, save=${saveMs}ms`);

      return Response.json({
        final_brief: parsed,
        brief_id: savedBrief?.id || null,
        provider_log: { provider_used: "openai", step_name: "final_brief", success: true },
        _debug: { total_ms: totalMs, save_ms: saveMs },
      });
    }

    // ── improveFinalBrief ───────────────────────────────────────────────────────
    if (action === "improveFinalBrief") {
      const { original_brief, feedback_text, client_name: cname, main_goal: cgoal } = body;
      if (!original_brief || !feedback_text) {
        return Response.json({ error: "original_brief and feedback_text required" }, { status: 400 });
      }
      const t0 = Date.now();

      const improveUser = `Business: ${cname || ""}. Goal: ${cgoal || ""}.
Feedback: "${feedback_text}"

Original brief:
${JSON.stringify(original_brief, null, 2)}

Improve based on the feedback. Keep all fields. Adjust only what feedback indicates.`;

      const parsed = await callOpenAIParsed(IMPROVE_SYSTEM, improveUser, 0.65);
      const totalMs = Date.now() - t0;
      console.log(`[improve] total=${totalMs}ms`);
      return Response.json({ final_brief: parsed, provider: "openai", _debug: { total_ms: totalMs } });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("grokBriefiFlow error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});