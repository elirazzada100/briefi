import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("non-UGC ConceptBank batch and allowed styles stay locked to the stable set", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");
  const removedBatch = "1000_" + "UGC_Briefi_10_display_clean";
  const removedStyle = "u" + "gc";

  assert.ok(source.includes('const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";'));
  assert.ok(source.includes('const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];'));
  assert.ok(!source.includes(removedBatch));
  assert.ok(!source.includes(`"${removedStyle}"`));
  assert.ok(!source.includes(`'${removedStyle}'`));
});

test("regular concept retrieval stays strict to active ConceptBank filters", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("const retrievalQuery = {"));
  assert.ok(source.includes("is_active: true,"));
  assert.ok(source.includes("source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,"));
  assert.ok(source.includes("industry_order: industryOrder,"));
  assert.ok(source.includes("user_facing_video_style: videoStyle,"));
  assert.ok(source.includes("const candidates = await base44.asServiceRole.entities.ConceptBank.filter("));
  assert.ok(source.includes('"concept_number_in_section"'));
  assert.ok(source.includes("20"));
  assert.ok(source.includes('message: "לא נמצאו קונספטים מתאימים לבנק הקונספטים. צריך לבדוק קטגוריה/סגנון או לוודא שהבנק נטען."'));
});

test("business category classification maps into industry_order for ConceptBank retrieval", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('const classifyRes = await base44.asServiceRole.functions.invoke("classifyBusinessCategory", {'));
  assert.ok(source.includes("const mapped = INDUSTRY_MAP[clf?.category_id];"));
  assert.ok(source.includes("industryOrder = mapped.order;"));
  assert.ok(source.includes("classifiedIndustry: { industry_order: industryOrder, industry_name: industryName }"));
  assert.ok(source.includes('details: "industry_order missing or out of range"'));
  assert.ok(source.includes('message: "לא הצלחנו לסווג את העסק. נסו שוב."'));
});

test("Grok is constrained to ConceptBank candidate pool and cannot invent freeform regular concepts", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("const candidateIdSet = new Set(pool.map(c => c.id));"));
  assert.ok(source.includes('[${i + 1}] ID: ${c.id}\\n  Title: ${c.concept_title}\\n  Text: ${c.concept_raw_text}'));
  assert.ok(source.includes("Select EXACTLY 4 concepts from the provided pool."));
  assert.ok(source.includes("Do NOT invent new concepts. Do NOT use concepts from outside the pool."));
  assert.ok(source.includes('source_type must always be "concept_bank".'));
  assert.ok(source.includes('{"concepts":[{"concept_title":"","short_description":"","why_it_works":"","idea_tags":[],"source_concept_id":"exact-id-from-pool"}]}'));
  assert.ok(source.includes('if (!c.concept_bank_id || !candidateIdSet.has(c.concept_bank_id)) validationErrors.push'));
  assert.ok(source.includes('if (c.industry_order !== industryOrder) validationErrors.push'));
  assert.ok(source.includes('if (c.user_facing_video_style !== videoStyle) validationErrors.push'));
  assert.ok(source.includes('error: "GROK_CONCEPT_SELECTION_VALIDATION_FAILED"'));
});

test("regular concept flow returns graceful no-candidates errors instead of crashing", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("if (candidates.length < 4) {"));
  assert.ok(source.includes('error: "CONCEPT_RETRIEVAL_FAILED"'));
  assert.ok(source.includes('message: "לא נמצאו קונספטים מתאימים לבנק הקונספטים. צריך לבדוק קטגוריה/סגנון או לוודא שהבנק נטען."'));
  assert.ok(source.includes("candidate_count: candidates.length,"));
  assert.ok(source.includes("source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,"));
});
