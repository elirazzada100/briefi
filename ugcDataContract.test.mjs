import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");
const REGULAR_BATCH = "1000_Concepts_Briefi_10_display_clean";
const OLD_UGC_BATCH = "1000_UGC_Briefi_10_display_clean";
const FUTURE_UGC_BATCH = "1000_UGC_Briefi_10_display_clean_v2";
const FUTURE_UGC_STYLE_KEY = "ugc";
const FUTURE_UGC_LABEL = "UGC / המלצה";
const FUTURE_UGC_SOURCE_FILE = "briefi_ugc_conceptbank_1000_v2_import_ready_clean.csv";

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("regular ConceptBank batch stays isolated while future UGC batch contract is defined separately", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const benchmark = read("base44/functions/benchmarkAIProviders/entry.ts");

  assert.ok(grokFlow.includes(REGULAR_BATCH));
  assert.ok(benchmark.includes(REGULAR_BATCH));
  assert.ok(!grokFlow.includes(OLD_UGC_BATCH));
  assert.ok(!benchmark.includes(OLD_UGC_BATCH));
  assert.notEqual(FUTURE_UGC_BATCH, REGULAR_BATCH);
  assert.notEqual(FUTURE_UGC_BATCH, OLD_UGC_BATCH);
});

test("current UI and runtime keep UGC inactive and invisible", () => {
  const stylePicker = read("src/pages/VideoStylePicker.jsx");
  const app = read("src/App.jsx");
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(!stylePicker.includes(FUTURE_UGC_LABEL));
  assert.ok(!stylePicker.includes('id: "ugc"'));
  assert.ok(!stylePicker.includes(`id: "${FUTURE_UGC_STYLE_KEY}"`));
  assert.ok(!app.includes("ugc"));
  assert.ok(!grokFlow.includes(`"${FUTURE_UGC_STYLE_KEY}"`));
  assert.ok(!grokFlow.includes(FUTURE_UGC_BATCH));
  assert.ok(!grokFlow.includes(OLD_UGC_BATCH));
});

test("future UGC contract is locked in tests without enabling runtime yet", () => {
  assert.equal(FUTURE_UGC_STYLE_KEY, "ugc");
  assert.equal(FUTURE_UGC_LABEL, "UGC / המלצה");
  assert.equal(FUTURE_UGC_BATCH, "1000_UGC_Briefi_10_display_clean_v2");

  const futureContract = {
    style_key: FUTURE_UGC_STYLE_KEY,
    label: FUTURE_UGC_LABEL,
    source_batch: FUTURE_UGC_BATCH,
    includes_special_focus: true,
    includes_hook: true,
    skips_hook_like_trendy: false,
    requires_dedicated_candidate_pool: true,
    validates_returned_ids_against_candidate_pool: true,
  };

  assert.equal(futureContract.includes_special_focus, true);
  assert.equal(futureContract.includes_hook, true);
  assert.equal(futureContract.skips_hook_like_trendy, false);
  assert.equal(futureContract.requires_dedicated_candidate_pool, true);
  assert.equal(futureContract.validates_returned_ids_against_candidate_pool, true);
});

test("importer supports explicit ugc_v2 source without changing regular import defaults", () => {
  const importer = read("base44/functions/importConceptBank/entry.ts");

  assert.ok(importer.includes('const REGULAR_CSV_URL ='));
  assert.ok(importer.includes('const UGC_V2_SOURCE = "ugc_v2"'));
  assert.ok(importer.includes(`const UGC_V2_SOURCE_FILE = "${FUTURE_UGC_SOURCE_FILE}"`));
  assert.ok(importer.includes(`const UGC_V2_SOURCE_BATCH = "${FUTURE_UGC_BATCH}"`));
  assert.ok(importer.includes(`const OLD_UGC_SOURCE_BATCH = "${OLD_UGC_BATCH}"`));
  assert.ok(importer.includes('if (source === UGC_V2_SOURCE)'));
  assert.ok(importer.includes('const source = body?.source;'));
  assert.ok(importer.includes('source: "regular"'));
  assert.ok(importer.includes('Deno.readTextFile(UGC_V2_LOCAL_FILE_URL)'));
  assert.ok(importer.includes('source_batch: r[\'source_batch\'] || \'\''));
});

test("future UGC import contract blocks old batch reuse and duplicate active imports", () => {
  const importer = read("base44/functions/importConceptBank/entry.ts");
  const verifier = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");

  assert.ok(importer.includes('if (row[\'source_batch\'] === OLD_UGC_SOURCE_BATCH)'));
  assert.ok(importer.includes('Active UGC v2 rows already exist. Re-run with force=true to import again.'));
  assert.ok(importer.includes('already_exists: true'));
  assert.ok(importer.includes('force = body?.force === true'));
  assert.ok(verifier.includes(`const UGC_V2_SOURCE_BATCH = "${FUTURE_UGC_BATCH}"`));
  assert.ok(verifier.includes(`const UGC_V2_SOURCE_FILE = "${FUTURE_UGC_SOURCE_FILE}"`));
  assert.ok(verifier.includes(`const OLD_UGC_SOURCE_BATCH = "${OLD_UGC_BATCH}"`));
});

test("future UGC verification contract requires explicit ugc_v2 source and keeps the regular batch isolated", () => {
  const verifier = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");

  assert.ok(verifier.includes('if (body?.source !== UGC_V2_SOURCE)'));
  assert.ok(verifier.includes('Explicit payload { "source": "ugc_v2" } is required.'));
  assert.ok(verifier.includes('Active UGC v2 rows = ${ugcRows.length} (expected 1000)'));
  assert.ok(verifier.includes('industry_order=${order} has ${rowsPerIndustryOrder[order]} rows (expected 100)'));
  assert.ok(verifier.includes('forbidden dash characters remain in concept_title/concept_raw_text'));
  assert.ok(verifier.includes('Regular ConceptBank batch was not found during isolation check'));
});
