import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("regular concept flow uses the non-UGC ConceptBank batch and strict retrieval filters", () => {
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokSource.includes('const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean"'));
  assert.ok(!grokSource.includes("1000_UGC_Briefi_10_display_clean"));
  assert.ok(grokSource.includes("is_active: true"));
  assert.ok(grokSource.includes("source_batch: ACTIVE_CONCEPT_SOURCE_BATCH"));
  assert.ok(grokSource.includes("industry_order: industryOrder"));
  assert.ok(grokSource.includes("user_facing_video_style: videoStyle"));
});

test("regular concept candidate pool comes from ConceptBank rows only", () => {
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokSource.includes("const candidates = await base44.asServiceRole.entities.ConceptBank.filter("));
  assert.ok(grokSource.includes("const pool = candidates.sort(() => Math.random() - 0.5);"));
  assert.ok(grokSource.includes("ID: ${c.id}"));
  assert.ok(grokSource.includes("Title: ${c.concept_title}"));
  assert.ok(grokSource.includes("Text: ${c.concept_raw_text}"));
});

test("Grok is constrained to choose from candidate pool and invented ids are rejected", () => {
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokSource.includes("Do NOT invent new concepts. Do NOT use concepts from outside the pool."));
  assert.ok(grokSource.includes("source_concept_id MUST be an exact ID from the pool list provided."));
  assert.ok(grokSource.includes('source_type must always be "concept_bank"'));
  assert.ok(grokSource.includes("const candidateIdSet = new Set(pool.map(c => c.id));"));
  assert.ok(grokSource.includes('if (!c.concept_bank_id || !candidateIdSet.has(c.concept_bank_id))'));
  assert.ok(grokSource.includes('error: "GROK_CONCEPT_SELECTION_VALIDATION_FAILED"'));
});

test("classification maps to industry_order and style maps to user_facing_video_style", () => {
  const classifySource = read("base44/functions/classifyBusinessCategory/entry.ts");
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(classifySource.includes("result.industry_order = cat.industry_order;"));
  assert.ok(classifySource.includes("result.industry_name = cat.name_he;"));
  assert.ok(grokSource.includes("let industryOrder = businessAnalysis?.industry_order"));
  assert.ok(grokSource.includes("if (!BANK_STYLES.includes(videoStyle))"));
  assert.ok(grokSource.includes("user_facing_video_style: videoStyle"));
});

test("zero candidates returns a clear ConceptBank error and never falls back to UGC or invention", () => {
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokSource.includes("לא נמצאו קונספטים מתאימים בבנק הקונספטים. צריך לבדוק שהבנק נטען ושיש התאמה בין קטגוריה לסגנון."));
  assert.ok(!grokSource.includes("1000_UGC_Briefi_10_display_clean"));
  assert.ok(!grokSource.includes('videoStyle === "ugc"'));
});
