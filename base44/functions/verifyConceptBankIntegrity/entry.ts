import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";
const STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];
const INDUSTRIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Number prefix pattern: "57. " or "12. " at start of string
const NUMBER_PREFIX_RE = /^\d+[\.\)]\s/;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const issues = [];

    // ── 1. Fetch ALL active rows ────────────────────────────────────────────
    // Fetch in batches since list() may be limited
    let allActive = [];
    let skip = 0;
    const BATCH = 200;
    while (true) {
      const batch = await base44.asServiceRole.entities.ConceptBank.filter(
        { is_active: true },
        "global_concept_number",
        BATCH,
        skip
      );
      allActive = allActive.concat(batch);
      if (batch.length < BATCH) break;
      skip += BATCH;
    }

    const activeCount = allActive.length;

    // ── 2. source_batch check ───────────────────────────────────────────────
    const wrongBatch = allActive.filter(r => r.source_batch !== SOURCE_BATCH);
    const noOldBatches = wrongBatch.length === 0;
    if (wrongBatch.length > 0) {
      issues.push(`${wrongBatch.length} active rows have wrong source_batch`);
    }

    // ── 3. Count per industry (should be 100 each) ──────────────────────────
    const byIndustry = {};
    for (const order of INDUSTRIES) byIndustry[order] = 0;
    const badIndustryCounts = [];
    for (const r of allActive) {
      if (byIndustry[r.industry_order] !== undefined) {
        byIndustry[r.industry_order]++;
      }
    }
    for (const order of INDUSTRIES) {
      if (byIndustry[order] !== 100) {
        badIndustryCounts.push(`industry_order=${order} has ${byIndustry[order]} rows (expected 100)`);
      }
    }
    if (badIndustryCounts.length > 0) {
      issues.push(...badIndustryCounts);
    }

    // ── 4. Numeric fields validation ────────────────────────────────────────
    let emptyIndustryOrder = 0;
    let badNumericFields = 0;
    let emptyRequiredFields = 0;
    let titlesWithNumberPrefix = 0;
    let rawTextWithNumberPrefix = 0;
    let emptyTitle = 0;
    let emptyRawText = 0;
    const artifactPatterns = [/""|,,|^,|,$|\\n|\\r|\\"/]; // CSV/markdown artifacts
    let artifactCount = 0;
    let brokenQuoteCount = 0;

    for (const r of allActive) {
      // industry_order
      if (r.industry_order === null || r.industry_order === undefined || r.industry_order === "") {
        emptyIndustryOrder++;
      } else if (typeof r.industry_order !== 'number') {
        badNumericFields++;
      }

      // global_concept_number
      if (r.global_concept_number === null || r.global_concept_number === undefined || r.global_concept_number === "") {
        badNumericFields++;
      } else if (typeof r.global_concept_number !== 'number') {
        badNumericFields++;
      }

      // concept_number_in_section
      if (r.concept_number_in_section === null || r.concept_number_in_section === undefined || r.concept_number_in_section === "") {
        badNumericFields++;
      } else if (typeof r.concept_number_in_section !== 'number') {
        badNumericFields++;
      }

      // concept_title
      if (!r.concept_title || r.concept_title.trim() === "") {
        emptyTitle++;
        emptyRequiredFields++;
      } else {
        if (NUMBER_PREFIX_RE.test(r.concept_title.trim())) titlesWithNumberPrefix++;
        // Broken quotes: title contains escaped quotes or lone \"
        if (r.concept_title.includes('\\"') || r.concept_title.includes("\\\"")) brokenQuoteCount++;
        // CSV artifact check
        if (/,,|^,|\\n|\\r/.test(r.concept_title)) artifactCount++;
      }

      // concept_raw_text
      if (!r.concept_raw_text || r.concept_raw_text.trim() === "") {
        emptyRawText++;
        emptyRequiredFields++;
      } else {
        if (NUMBER_PREFIX_RE.test(r.concept_raw_text.trim())) rawTextWithNumberPrefix++;
        if (r.concept_raw_text.includes('\\"') || r.concept_raw_text.includes("\\\"")) brokenQuoteCount++;
        if (/,,|^,|\\n|\\r/.test(r.concept_raw_text)) artifactCount++;
      }
    }

    if (emptyIndustryOrder > 0) issues.push(`${emptyIndustryOrder} rows have null/empty industry_order`);
    if (badNumericFields > 0) issues.push(`${badNumericFields} rows have non-numeric global/section concept numbers`);
    if (emptyTitle > 0) issues.push(`${emptyTitle} rows have empty concept_title`);
    if (emptyRawText > 0) issues.push(`${emptyRawText} rows have empty concept_raw_text`);
    if (titlesWithNumberPrefix > 0) issues.push(`${titlesWithNumberPrefix} concept_titles start with a number`);
    if (rawTextWithNumberPrefix > 0) issues.push(`${rawTextWithNumberPrefix} concept_raw_texts start with a number`);
    if (artifactCount > 0) issues.push(`${artifactCount} rows have CSV/markdown artifacts`);
    if (brokenQuoteCount > 0) issues.push(`${brokenQuoteCount} rows have broken/escaped quotes`);

    const numericFieldsValid = badNumericFields === 0 && emptyIndustryOrder === 0;
    const conceptTitlesClean = titlesWithNumberPrefix === 0 && artifactCount === 0 && brokenQuoteCount === 0;
    const conceptRawTextClean = rawTextWithNumberPrefix === 0;

    // ── 5. All industry/style combos return exactly 20 ──────────────────────
    const comboDetail = {};
    let allCombosReturn20 = true;
    let limdiOnlyLimdi = true;
    let salesOnlySales = true;

    for (const iOrder of INDUSTRIES) {
      for (const style of STYLES) {
        const rows = await base44.asServiceRole.entities.ConceptBank.filter({
          is_active: true,
          source_batch: SOURCE_BATCH,
          industry_order: iOrder,
          user_facing_video_style: style,
        });
        comboDetail[`industry_${iOrder}_${style}`] = rows.length;
        if (rows.length !== 20) {
          allCombosReturn20 = false;
          issues.push(`industry_order=${iOrder} style="${style}" returned ${rows.length} (expected 20)`);
        }

        if (style === "לימודי") {
          const nonLimdi = rows.filter(r => r.internal_concept_type !== "לימודי");
          if (nonLimdi.length > 0) {
            limdiOnlyLimdi = false;
            issues.push(`industry_order=${iOrder} לימודי has ${nonLimdi.length} rows with wrong internal_concept_type`);
          }
        }
        if (style === "מכירתי") {
          const nonSales = rows.filter(r => r.internal_concept_type !== "מכירתי");
          if (nonSales.length > 0) {
            salesOnlySales = false;
            issues.push(`industry_order=${iOrder} מכירתי has ${nonSales.length} rows with wrong internal_concept_type`);
          }
        }
      }
    }

    // ── 6. Actual end-to-end test: toy store → industry 9 → לימודי ──────────
    // Simulate classifyBusinessCategory mapping
    const INDUSTRY_MAP = {
      "food_restaurants": { order: 1, name: "מסעדנות ואוכל" },
      "beauty_aesthetics": { order: 2, name: "יופי ואסתטיקה" },
      "fitness_nutrition": { order: 3, name: "פיטנס ותזונה" },
      "coaches_consultants": { order: 4, name: "מאמנים, יועצים ונותני ידע" },
      "local_services": { order: 5, name: "עסקים מקומיים ושירותים לבית" },
      "real_estate_interiors": { order: 6, name: "נדל״ן, עיצוב פנים ושיפוצים" },
      "events_nightlife": { order: 7, name: "אירועים, לילה וחוויות" },
      "fashion_boutiques": { order: 8, name: "אופנה, תכשיטים ובוטיקים" },
      "parenting_family": { order: 9, name: "הורות, ילדים ומשפחה" },
      "health_wellness": { order: 10, name: "בריאות, טיפול ו-Wellness" },
    };

    // Call xAI directly to classify the test business
    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
    const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";

    const classifySystemPrompt = `You are a business classifier. Classify the business into exactly one of these categories and return ONLY valid JSON with field "category_id":
food_restaurants, beauty_aesthetics, fitness_nutrition, coaches_consultants, local_services, real_estate_interiors, events_nightlife, fashion_boutiques, parenting_family, health_wellness.
Return: {"category_id": "..."}`;

    const classifyApiRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          { role: "system", content: classifySystemPrompt },
          { role: "user", content: "חנות צעצועים גדולה ביבנה. הורים, ילדים, מתנות יום הולדת, משחקים, התלבטויות, לחץ של הורים בקופה." }
        ],
        temperature: 0,
      }),
    });
    const classifyData = await classifyApiRes.json();
    const classifyRaw = classifyData?.choices?.[0]?.message?.content || "{}";
    const clf = JSON.parse(classifyRaw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim());

    const mappedIndustry = INDUSTRY_MAP[clf?.category_id];
    const classifiedOrder = mappedIndustry?.order || null;
    const classifiedName = mappedIndustry?.name || clf?.category_name_he || "";

    const classificationCorrect = classifiedOrder === 9 && classifiedName === "הורות, ילדים ומשפחה";
    if (!classificationCorrect) {
      issues.push(`Test classification failed: got category_id="${clf?.category_id}" order=${classifiedOrder} name="${classifiedName}" (expected order=9, "הורות, ילדים ומשפחה")`);
    }

    // Now retrieve the 20 לימודי concepts for industry 9
    const testRows = await base44.asServiceRole.entities.ConceptBank.filter({
      is_active: true,
      source_batch: SOURCE_BATCH,
      industry_order: 9,
      user_facing_video_style: "לימודי",
    });

    const testCount = testRows.length;
    const testAllLimdi = testRows.every(r => r.internal_concept_type === "לימודי");
    const testAllIndustry9 = testRows.every(r => r.industry_order === 9);
    const testAllCorrectStyle = testRows.every(r => r.user_facing_video_style === "לימודי");

    const testLimdiRetrievalClean = testCount === 20 && testAllLimdi && testAllIndustry9 && testAllCorrectStyle;

    if (testCount !== 20) issues.push(`Test retrieval: got ${testCount} rows for industry_order=9, לימודי (expected 20)`);
    if (!testAllLimdi) issues.push(`Test retrieval: some rows have wrong internal_concept_type (not לימודי)`);
    if (!testAllIndustry9) issues.push(`Test retrieval: some rows have wrong industry_order (not 9)`);
    if (!testAllCorrectStyle) issues.push(`Test retrieval: some rows have wrong user_facing_video_style`);

    // ── 7. User-facing card cleanliness: sample 10 rows from test set ───────
    const sampleRows = testRows.slice(0, 10);
    let cardIssues = 0;
    for (const r of sampleRows) {
      const title = (r.concept_title || "").replace(/^\d+[\.\)]\s/, "").trim();
      if (NUMBER_PREFIX_RE.test(r.concept_title || "")) cardIssues++;
      if (/,,|\\n|\\r/.test(title)) cardIssues++;
      if (/\\"|""/.test(title)) cardIssues++;
    }
    const userCardsClean = cardIssues === 0;
    if (!userCardsClean) issues.push(`${cardIssues} card cleanliness issues found in sample`);

    // ── Final verdict ────────────────────────────────────────────────────────
    const passed =
      activeCount === 1000 &&
      noOldBatches &&
      numericFieldsValid &&
      emptyRequiredFields === 0 &&
      conceptTitlesClean &&
      conceptRawTextClean &&
      allCombosReturn20 &&
      limdiOnlyLimdi &&
      salesOnlySales &&
      classificationCorrect &&
      testLimdiRetrievalClean &&
      userCardsClean &&
      issues.length === 0;

    return Response.json({
      backend_import_workaround_safe: passed,
      active_conceptbank_count: activeCount,
      active_source_batch: SOURCE_BATCH,
      no_old_source_batches_active: noOldBatches,
      numeric_fields_valid: numericFieldsValid,
      empty_industry_order_rows: emptyIndustryOrder,
      empty_required_fields: emptyRequiredFields,
      concept_titles_clean: conceptTitlesClean,
      concept_raw_text_clean: conceptRawTextClean,
      all_industry_style_combinations_return_20: allCombosReturn20,
      limdi_only_limdi: limdiOnlyLimdi,
      sales_only_sales: salesOnlySales,
      test_business_classification_correct: classificationCorrect,
      test_business_classified_as: { order: classifiedOrder, name: classifiedName, category_id: clf?.category_id },
      test_limdi_retrieval_count: testCount,
      test_limdi_retrieval_clean: testLimdiRetrievalClean,
      user_cards_clean: userCardsClean,
      passed,
      issues,
      _detail_per_industry_count: byIndustry,
      _combo_detail: comboDetail,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});