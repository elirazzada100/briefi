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

test("current importer is unchanged and would need a separate UGC data contract later", () => {
  const importer = read("base44/functions/importConceptBank/entry.ts");

  assert.ok(importer.includes("const CSV_URL ="));
  assert.ok(importer.includes("source_batch: r['source_batch'] || ''"));
  assert.ok(!importer.includes(FUTURE_UGC_BATCH));
  assert.ok(!importer.includes(OLD_UGC_BATCH));
});
