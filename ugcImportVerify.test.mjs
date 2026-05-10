import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");
const REGULAR_BATCH = "1000_Concepts_Briefi_10_display_clean";
const UGC_V2_BATCH = "1000_UGC_Briefi_10_display_clean_v2";
const OLD_UGC_BATCH = "1000_UGC_Briefi_10_display_clean";
const UGC_V2_SOURCE_FILE = "briefi_ugc_conceptbank_1000_v2_import_ready_flat.csv";
const REGULAR_CSV_URL = "https://media.base44.com/files/public/69ed0172145044ff033ecacf/2db45fb33_briefi_concept_csv.csv";
const UGC_V2_REMOTE_CSV_URL = "https://raw.githubusercontent.com/elirazzada100/briefi/main/briefi_ugc_conceptbank_1000_v2_import_ready_flat.csv";

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
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
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        currentLine += ch;
      }
    } else if (ch === "\n" && !inQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else if (ch !== "\r") {
      currentLine += ch;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header.replace(/^\uFEFF/, "").replace(/^"|"$/g, "").trim()] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

test("flat UGC v2 CSV artifact exists and matches the import contract", () => {
  const csvPath = path.join(repoRoot, UGC_V2_SOURCE_FILE);
  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(csvText);
  const perIndustry = {};
  let dashCount = 0;

  for (let order = 1; order <= 10; order++) perIndustry[order] = 0;

  rows.forEach((row) => {
    perIndustry[Number(row.industry_order)]++;
    if (/[-–—־]/.test(row.concept_title || "")) dashCount++;
    if (/[-–—־]/.test(row.concept_raw_text || "")) dashCount++;
  });

  assert.equal(rows.length, 1000);
  assert.deepEqual(Object.keys(rows[0]), [
    "global_concept_number",
    "industry_order",
    "industry_name",
    "internal_concept_type",
    "concept_number_in_section",
    "user_facing_video_style",
    "concept_title",
    "concept_raw_text",
    "source_file",
    "source_batch",
    "is_active",
  ]);
  assert.deepEqual([...new Set(rows.map((row) => row.source_batch))], [UGC_V2_BATCH]);
  assert.deepEqual([...new Set(rows.map((row) => row.source_file))], [UGC_V2_SOURCE_FILE]);
  assert.deepEqual([...new Set(rows.map((row) => row.user_facing_video_style))], ["ugc"]);
  assert.equal(rows.filter((row) => row.source_batch === OLD_UGC_BATCH).length, 0);
  assert.equal(rows.filter((row) => !row.concept_title?.trim()).length, 0);
  assert.equal(rows.filter((row) => !row.concept_raw_text?.trim()).length, 0);
  assert.equal(dashCount, 0);
  for (let order = 1; order <= 10; order++) {
    assert.equal(perIndustry[order], 100);
  }
});

test("UGC import and verify code stay isolated from active runtime batches while UI/runtime use the v2 UGC path", () => {
  const stylePicker = read("src/pages/VideoStylePicker.jsx");
  const app = read("src/App.jsx");
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const importer = read("base44/functions/importConceptBank/entry.ts");
  const verifier = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");

  assert.ok(stylePicker.includes("UGC / המלצה"));
  assert.ok(stylePicker.includes('id: "ugc"'));
  assert.ok(!app.includes('ugc'));
  assert.ok(grokFlow.includes(UGC_V2_BATCH));
  assert.ok(!grokFlow.includes(`${OLD_UGC_BATCH}"`));
  assert.ok(importer.includes(`const REGULAR_CSV_URL = "${REGULAR_CSV_URL}"`));
  assert.ok(importer.includes(`const UGC_V2_REMOTE_CSV_URL = "${UGC_V2_REMOTE_CSV_URL}"`));
  assert.ok(importer.includes('await fetch(UGC_V2_REMOTE_CSV_URL)'));
  assert.ok(!importer.includes('Deno.readTextFile(UGC_V2_LOCAL_FILE_URL)'));
  assert.ok(!importer.includes('briefi_ugc_conceptbank_1000_v2_import_ready_clean.csv"'));
  assert.ok(!importer.includes('briefi_ugc_conceptbank_1000_v2_import_ready.csv"'));
  assert.ok(importer.includes('source === UGC_V2_SOURCE'));
  assert.ok(verifier.includes('const REGULAR_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean"'));
});
