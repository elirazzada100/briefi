import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REGULAR_CSV_URL = "https://media.base44.com/files/public/69ed0172145044ff033ecacf/2db45fb33_briefi_concept_csv.csv";
const UGC_V2_SOURCE = "ugc_v2";
const UGC_V2_SOURCE_FILE = "briefi_ugc_conceptbank_1000_v2_import_ready_flat.csv";
const UGC_V2_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean_v2";
const OLD_UGC_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean";
const UGC_V2_REMOTE_CSV_URL = "https://raw.githubusercontent.com/elirazzada100/briefi/main/briefi_ugc_conceptbank_1000_v2_import_ready_flat.csv";
const BATCH_SIZE = 50;

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const key = h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim();
      obj[key] = values[idx];
    });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function mapRowToRecord(r) {
  return {
    global_concept_number: Number(r['global_concept_number']) || null,
    industry_order: Number(r['industry_order']) || null,
    industry_name: r['industry_name'] || '',
    internal_concept_type: r['internal_concept_type'] || '',
    concept_number_in_section: Number(r['concept_number_in_section']) || null,
    user_facing_video_style: r['user_facing_video_style'] || '',
    concept_title: r['concept_title'] || '',
    concept_raw_text: r['concept_raw_text'] || '',
    source_file: r['source_file'] || '',
    source_batch: r['source_batch'] || '',
    is_active: r['is_active'] === 'true' || r['is_active'] === true,
  };
}

function validateUGCV2Rows(rows) {
  const errors = [];
  const forbiddenDashChars = /[-–—־]/;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    if (row['source_batch'] !== UGC_V2_SOURCE_BATCH) {
      errors.push(`Row ${rowNumber} has invalid source_batch "${row['source_batch']}"`);
    }
    if (row['source_batch'] === OLD_UGC_SOURCE_BATCH) {
      errors.push(`Row ${rowNumber} reuses blocked old UGC source_batch`);
    }
    if (row['source_file'] !== UGC_V2_SOURCE_FILE) {
      errors.push(`Row ${rowNumber} has invalid source_file "${row['source_file']}"`);
    }
    if (row['user_facing_video_style'] !== 'ugc') {
      errors.push(`Row ${rowNumber} has invalid user_facing_video_style "${row['user_facing_video_style']}"`);
    }
    if (row['is_active'] !== 'true' && row['is_active'] !== true) {
      errors.push(`Row ${rowNumber} must be active`);
    }
    if (!row['concept_title'] || !row['concept_title'].trim()) {
      errors.push(`Row ${rowNumber} has empty concept_title`);
    }
    if (!row['concept_raw_text'] || !row['concept_raw_text'].trim()) {
      errors.push(`Row ${rowNumber} has empty concept_raw_text`);
    }
    if (forbiddenDashChars.test(row['concept_title'] || '')) {
      errors.push(`Row ${rowNumber} concept_title still contains forbidden dash characters`);
    }
    if (forbiddenDashChars.test(row['concept_raw_text'] || '')) {
      errors.push(`Row ${rowNumber} concept_raw_text still contains forbidden dash characters`);
    }
  });

  return errors;
}

async function readRequestBody(req) {
  const raw = await req.text();
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function loadRowsForSource(source) {
  if (source === UGC_V2_SOURCE) {
    const csvRes = await fetch(UGC_V2_REMOTE_CSV_URL);
    if (!csvRes.ok) throw new Error(`Failed to fetch UGC v2 CSV: ${csvRes.status}`);
    const csvText = await csvRes.text();
    return {
      source,
      source_batch: UGC_V2_SOURCE_BATCH,
      source_file: UGC_V2_SOURCE_FILE,
      rows: parseCSV(csvText),
    };
  }

  const csvRes = await fetch(REGULAR_CSV_URL);
  if (!csvRes.ok) throw new Error(`Failed to fetch CSV: ${csvRes.status}`);
  const csvText = await csvRes.text();
  return {
    source: "regular",
    source_batch: "row_driven_remote_csv",
    source_file: "remote_csv",
    rows: parseCSV(csvText),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await readRequestBody(req);
    const source = body?.source;
    const force = body?.force === true;

    if (source && source !== UGC_V2_SOURCE) {
      return Response.json({
        success: false,
        source,
        source_batch: null,
        already_exists: false,
        total_parsed: 0,
        inserted: 0,
        failed: 0,
        errors: [`Unsupported source "${source}"`],
      }, { status: 400 });
    }

    if (source === UGC_V2_SOURCE) {
      const existing = await base44.asServiceRole.entities.ConceptBank.filter(
        { is_active: true, source_batch: UGC_V2_SOURCE_BATCH },
        "global_concept_number",
        1
      );

      if (existing.length > 0 && !force) {
        return Response.json({
          success: false,
          source: UGC_V2_SOURCE,
          source_batch: UGC_V2_SOURCE_BATCH,
          already_exists: true,
          total_parsed: 0,
          inserted: 0,
          failed: 0,
          errors: ["Active UGC v2 rows already exist. Re-run with force=true to import again."],
        }, { status: 409 });
      }
    }

    const loaded = await loadRowsForSource(source);
    const rows = loaded.rows;
    const errors = source === UGC_V2_SOURCE ? validateUGCV2Rows(rows) : [];

    if (errors.length > 0) {
      return Response.json({
        success: false,
        source: loaded.source,
        source_batch: loaded.source_batch,
        already_exists: false,
        total_parsed: rows.length,
        inserted: 0,
        failed: rows.length,
        errors,
      }, { status: 400 });
    }

    let inserted = 0;
    let failed = 0;
    const batchErrors = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const records = batch.map(mapRowToRecord);

      try {
        await base44.asServiceRole.entities.ConceptBank.bulkCreate(records);
        inserted += records.length;
      } catch (err) {
        const message = `Batch ${i}-${i + BATCH_SIZE} failed: ${err.message}`;
        console.error(message);
        batchErrors.push(message);
        failed += records.length;
      }
    }

    return Response.json({
      success: failed === 0,
      source: loaded.source,
      source_batch: loaded.source_batch,
      already_exists: false,
      total_parsed: rows.length,
      inserted,
      failed,
      errors: batchErrors,
    });

  } catch (error) {
    console.error('importConceptBank error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
