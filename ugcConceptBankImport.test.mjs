import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");
const sourcePath = path.join(repoRoot, "base44/data/conceptbank/briefi_ugc_conceptbank_1000.csv");
const importReadyPath = path.join(repoRoot, "base44/data/conceptbank/briefi_ugc_conceptbank_1000_import_ready.csv");

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSVFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((line, idx, arr) => !(idx === arr.length - 1 && line === ""));
  const headers = parseCSVLine(lines[0].replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

test("UGC source and import-ready ConceptBank files exist", () => {
  assert.ok(fs.existsSync(sourcePath));
  assert.ok(fs.existsSync(importReadyPath));
});

test("UGC import-ready file matches active ConceptBank import shape", () => {
  const rows = parseCSVFile(importReadyPath);
  assert.equal(rows.length, 1000);

  const categories = new Map();
  for (const row of rows) {
    categories.set(row.industry_name, (categories.get(row.industry_name) || 0) + 1);
    assert.equal(row.user_facing_video_style, "ugc");
    assert.equal(row.source_batch, "1000_UGC_Briefi_10_display_clean");
    assert.equal(row.source_file, "briefi_ugc_conceptbank_1000.csv");
    assert.equal(row.is_active, "true");
    assert.ok(!/^\s*\d+[\.\-)\s]/.test(row.concept_title), `concept_title starts with number: ${row.concept_title}`);
    assert.ok(row.concept_raw_text.includes("Built-in hook:"));
    assert.ok(row.concept_raw_text.includes("Body template:"));
    assert.ok(row.concept_raw_text.includes("CTA template:"));
  }

  assert.equal(categories.size, 10);
  for (const count of categories.values()) {
    assert.equal(count, 100);
  }
});
