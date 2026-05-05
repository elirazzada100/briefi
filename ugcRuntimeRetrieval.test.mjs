import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("ugc is accepted as a ConceptBank style and uses the UGC batch", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('const UGC_CONCEPT_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean";'));
  assert.ok(source.includes('const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי", "ugc"];'));
  assert.ok(source.includes('const conceptSourceBatch = videoStyle === "ugc"'));
  assert.ok(source.includes('? UGC_CONCEPT_SOURCE_BATCH'));
  assert.ok(source.includes(': ACTIVE_CONCEPT_SOURCE_BATCH;'));
  assert.ok(source.includes('source_batch: conceptSourceBatch'));
  assert.ok(source.includes('user_facing_video_style: videoStyle'));
});

test("non-ugc retrieval keeps the old batch and trendy stays outside ConceptBank retrieval", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('if (videoStyle === "טרנדי") {'));
  assert.ok(source.includes('const retrievalQuery = {'));
  assert.ok(source.includes(': ACTIVE_CONCEPT_SOURCE_BATCH;'));
  assert.ok(!source.includes('videoStyle === "טרנדי" ? UGC_CONCEPT_SOURCE_BATCH'));
});

test("candidate payload sent to Grok still includes concept_title and concept_raw_text", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('Title: ${c.concept_title}'));
  assert.ok(source.includes('Text: ${c.concept_raw_text}'));
});
