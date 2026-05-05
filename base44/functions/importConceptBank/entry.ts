import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CSV_URL = "https://media.base44.com/files/public/69ed0172145044ff033ecacf/2db45fb33_briefi_concept_csv.csv";
const UGC_IMPORT_READY_PATH = new URL("../../data/conceptbank/briefi_ugc_conceptbank_1000_import_ready.csv", import.meta.url);

const CSV_SOURCES = {
  default: {
    type: "remote",
    url: CSV_URL,
  },
  ugc: {
    type: "local",
    path: UGC_IMPORT_READY_PATH,
    source_file: "briefi_ugc_conceptbank_1000.csv",
    source_batch: "1000_UGC_Briefi_10_display_clean",
  },
};

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
      // Strip BOM from first header
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const requestedSource = body?.source || "default";
    const sourceConfig = CSV_SOURCES[requestedSource];

    if (!sourceConfig) {
      return Response.json({
        error: "Unknown import source",
        allowed_sources: Object.keys(CSV_SOURCES),
      }, { status: 400 });
    }

    let csvText = "";
    if (sourceConfig.type === "remote") {
      const csvRes = await fetch(sourceConfig.url);
      if (!csvRes.ok) throw new Error(`Failed to fetch CSV: ${csvRes.status}`);
      csvText = await csvRes.text();
    } else {
      csvText = await Deno.readTextFile(sourceConfig.path);
    }

    const rows = parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows from CSV source "${requestedSource}"`);

    // Insert in batches of 50
    const BATCH_SIZE = 50;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const records = batch.map(r => ({
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
        is_active: r['is_active'] === 'true',
      }));

      try {
        await base44.asServiceRole.entities.ConceptBank.bulkCreate(records);
        inserted += records.length;
      } catch (err) {
        console.error(`Batch ${i}-${i + BATCH_SIZE} failed:`, err.message);
        failed += records.length;
      }
    }

    return Response.json({
      success: true,
      source: requestedSource,
      total_parsed: rows.length,
      inserted,
      failed,
    });

  } catch (error) {
    console.error('importConceptBank error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
