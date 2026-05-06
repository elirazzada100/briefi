import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Remote CSV sources
const CSV_SOURCES = {
  default: {
    url: "https://media.base44.com/files/public/69ed0172145044ff033ecacf/2db45fb33_briefi_concept_csv.csv",
    source_file: "1000_Concepts_Briefi_10.txt",
    source_batch: "1000_Concepts_Briefi_10_display_clean",
    mode: "standard",
  },
  ugc: {
    url: "https://media.base44.com/files/public/69ed0172145044ff033ecacf/1e3ec6e5f_briefi_ugc_conceptbank_1000.csv",
    source_file: "briefi_ugc_conceptbank_1000.csv",
    source_batch: "1000_UGC_Briefi_10_display_clean",
    mode: "ugc",
  },
};

// Industry name → order mapping for UGC CSV
const INDUSTRY_ORDER_MAP = {
  "מסעדנות ואוכל": 1,
  "יופי ואסתטיקה": 2,
  "פיטנס ותזונה": 3,
  "מאמנים, יועצים ונותני ידע": 4,
  "עסקים מקומיים ושירותים לבית": 5,
  'נדל"ן, עיצוב פנים ושיפוצים': 6,
  "אירועים, לילה וחוויות": 7,
  "אופנה, תכשיטים ובוטיקים": 8,
  "הורות, ילדים ומשפחה": 9,
  "בריאות, טיפול ו-Wellness": 10,
};

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length < 2) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const key = h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim();
      obj[key] = (values[idx] || '').replace(/^"|"$/g, '').trim();
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
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Map UGC raw CSV row → ConceptBank record
function mapUGCRow(r, idx, sourceConfig) {
  const categoryRaw = r['category'] || r['\uFEFFcategory'] || '';
  const industryOrder = INDUSTRY_ORDER_MAP[categoryRaw] || null;

  // Build concept_raw_text from all rich fields
  const parts = [
    r['concept_name'],
    r['use_when'],
    r['focus_fit'],
    r['built_in_hook'],
    r['core_idea'],
    r['video_structure'],
    r['body_template'],
    r['cta_template'],
    r['psychology'],
    r['filming_style'],
    r['adaptation_rule'],
  ].filter(Boolean);

  const conceptRawText = parts.join(' | ');

  return {
    global_concept_number: idx + 1,
    industry_order: industryOrder,
    industry_name: categoryRaw,
    internal_concept_type: 'ugc',
    concept_number_in_section: (idx % 100) + 1,
    user_facing_video_style: 'ugc',
    concept_title: r['concept_name'] || '',
    concept_raw_text: conceptRawText,
    source_file: sourceConfig.source_file,
    source_batch: sourceConfig.source_batch,
    is_active: true,
  };
}

// Map standard CSV row → ConceptBank record
function mapStandardRow(r, sourceConfig) {
  return {
    global_concept_number: Number(r['global_concept_number']) || null,
    industry_order: Number(r['industry_order']) || null,
    industry_name: r['industry_name'] || '',
    internal_concept_type: r['internal_concept_type'] || '',
    concept_number_in_section: Number(r['concept_number_in_section']) || null,
    user_facing_video_style: r['user_facing_video_style'] || '',
    concept_title: r['concept_title'] || '',
    concept_raw_text: r['concept_raw_text'] || '',
    source_file: r['source_file'] || sourceConfig.source_file,
    source_batch: r['source_batch'] || sourceConfig.source_batch,
    is_active: r['is_active'] === 'true' || r['is_active'] === true,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }

    const requestedSource = body?.source || "default";
    const sourceConfig = CSV_SOURCES[requestedSource];

    if (!sourceConfig) {
      return Response.json({
        error: "Unknown import source",
        allowed_sources: Object.keys(CSV_SOURCES),
      }, { status: 400 });
    }

    const csvRes = await fetch(sourceConfig.url);
    if (!csvRes.ok) throw new Error(`Failed to fetch CSV: ${csvRes.status}`);
    const csvText = await csvRes.text();

    const rows = parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows from source "${requestedSource}"`);

    const BATCH_SIZE = 50;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const records = batch.map((r, batchIdx) =>
        sourceConfig.mode === 'ugc'
          ? mapUGCRow(r, i + batchIdx, sourceConfig)
          : mapStandardRow(r, sourceConfig)
      );

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
      source_batch: sourceConfig.source_batch,
      total_parsed: rows.length,
      inserted,
      failed,
    });

  } catch (error) {
    console.error('importConceptBank error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});