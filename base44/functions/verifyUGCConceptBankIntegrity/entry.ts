import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const UGC_V2_SOURCE = "ugc_v2";
const UGC_V2_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean_v2";
const UGC_V2_SOURCE_FILE = "briefi_ugc_conceptbank_1000_v2_import_ready_clean.csv";
const OLD_UGC_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean";
const REGULAR_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";
const FORBIDDEN_DASH_CHARS = /[-–—־]/;

async function readRequestBody(req) {
  const raw = await req.text();
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await readRequestBody(req);
    if (body?.source !== UGC_V2_SOURCE) {
      return Response.json({
        passed: false,
        source: body?.source || null,
        source_batch: UGC_V2_SOURCE_BATCH,
        issues: ['Explicit payload { "source": "ugc_v2" } is required.'],
      }, { status: 400 });
    }

    let ugcRows = [];
    let skip = 0;
    const batchSize = 200;
    while (true) {
      const batch = await base44.asServiceRole.entities.ConceptBank.filter(
        { is_active: true, source_batch: UGC_V2_SOURCE_BATCH },
        "global_concept_number",
        batchSize,
        skip
      );
      ugcRows = ugcRows.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    const oldUgcActive = await base44.asServiceRole.entities.ConceptBank.filter(
      { is_active: true, source_batch: OLD_UGC_SOURCE_BATCH },
      "global_concept_number",
      1
    );

    const regularRows = await base44.asServiceRole.entities.ConceptBank.filter(
      { is_active: true, source_batch: REGULAR_SOURCE_BATCH },
      "global_concept_number",
      1
    );

    const issues = [];
    const rowsPerIndustryOrder = {};
    for (let order = 1; order <= 10; order++) rowsPerIndustryOrder[order] = 0;

    let emptyTitleRows = 0;
    let emptyRawTextRows = 0;
    let dashCharsRemainingInUserText = 0;
    let wrongSourceFileRows = 0;
    let wrongStyleRows = 0;

    for (const row of ugcRows) {
      if (rowsPerIndustryOrder[row.industry_order] !== undefined) {
        rowsPerIndustryOrder[row.industry_order]++;
      }
      if (row.source_file !== UGC_V2_SOURCE_FILE) wrongSourceFileRows++;
      if (row.user_facing_video_style !== 'ugc') wrongStyleRows++;
      if (!row.concept_title || !row.concept_title.trim()) emptyTitleRows++;
      if (!row.concept_raw_text || !row.concept_raw_text.trim()) emptyRawTextRows++;
      if (FORBIDDEN_DASH_CHARS.test(row.concept_title || '')) dashCharsRemainingInUserText++;
      if (FORBIDDEN_DASH_CHARS.test(row.concept_raw_text || '')) dashCharsRemainingInUserText++;
    }

    if (ugcRows.length !== 1000) issues.push(`Active UGC v2 rows = ${ugcRows.length} (expected 1000)`);
    for (let order = 1; order <= 10; order++) {
      if (rowsPerIndustryOrder[order] !== 100) {
        issues.push(`industry_order=${order} has ${rowsPerIndustryOrder[order]} rows (expected 100)`);
      }
    }
    if (wrongSourceFileRows > 0) issues.push(`${wrongSourceFileRows} rows have wrong source_file`);
    if (wrongStyleRows > 0) issues.push(`${wrongStyleRows} rows have wrong user_facing_video_style`);
    if (emptyTitleRows > 0) issues.push(`${emptyTitleRows} rows have empty concept_title`);
    if (emptyRawTextRows > 0) issues.push(`${emptyRawTextRows} rows have empty concept_raw_text`);
    if (dashCharsRemainingInUserText > 0) issues.push(`${dashCharsRemainingInUserText} forbidden dash characters remain in concept_title/concept_raw_text`);
    if (oldUgcActive.length > 0) issues.push("Old UGC batch is still active");
    if (regularRows.length === 0) issues.push("Regular ConceptBank batch was not found during isolation check");

    return Response.json({
      passed: issues.length === 0,
      source: UGC_V2_SOURCE,
      source_batch: UGC_V2_SOURCE_BATCH,
      source_file: UGC_V2_SOURCE_FILE,
      active_ugc_v2_rows: ugcRows.length,
      active_old_ugc_rows: oldUgcActive.length,
      regular_batch_found: regularRows.length > 0,
      rows_per_industry_order: rowsPerIndustryOrder,
      empty_title_rows: emptyTitleRows,
      empty_raw_text_rows: emptyRawTextRows,
      dash_chars_remaining_in_user_text: dashCharsRemainingInUserText,
      issues,
    });
  } catch (error) {
    console.error('verifyUGCConceptBankIntegrity error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
