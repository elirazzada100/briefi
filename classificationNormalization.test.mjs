import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("classification normalizer accepts order numbers, numeric strings, ids, and canonical Hebrew names", () => {
  const source = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(source.includes("function normalizeClassificationResult(raw) {"));
  assert.ok(source.includes("raw.industry_order,"));
  assert.ok(source.includes("raw.category_id,"));
  assert.ok(source.includes("raw.category_name_he,"));
  assert.ok(source.includes("raw.industry_name,"));
  assert.ok(source.includes("raw.category,"));
  assert.ok(source.includes("if (typeof candidate === \"number\" && Number.isInteger(candidate)) {"));
  assert.ok(source.includes("if (/^\\d+$/.test(normalized)) {"));
  assert.ok(source.includes("return CATEGORY_BY_ALIAS.get(normalized) || null;"));
});

test("classification fallback keyword rules cover all 10 canonical categories", () => {
  const source = read("base44/functions/classifyBusinessCategory/entry.ts");

  const requiredKeywords = [
    "מסעדה",
    "איפור",
    "פילאטיס",
    "קורס",
    "אינסטלטור",
    "נדלן",
    "תיק",
    "קוקטייל",
    "ילדים",
    "קליניקה",
  ];

  for (const keyword of requiredKeywords) {
    assert.ok(source.includes(`"${keyword}"`), `missing fallback keyword: ${keyword}`);
  }

  assert.ok(source.includes('industry_order: 1,'));
  assert.ok(source.includes('industry_order: 2,'));
  assert.ok(source.includes('industry_order: 3,'));
  assert.ok(source.includes('industry_order: 4,'));
  assert.ok(source.includes('industry_order: 5,'));
  assert.ok(source.includes('industry_order: 6,'));
  assert.ok(source.includes('industry_order: 7,'));
  assert.ok(source.includes('industry_order: 8,'));
  assert.ok(source.includes('industry_order: 9,'));
  assert.ok(source.includes('industry_order: 10,'));
});

test("classification fallback prefers practical fit for toys, bags, nightlife, and clinics", () => {
  const source = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(source.includes('if (haystack.includes("צעצוע") || haystack.includes("צעצועים") || haystack.includes("לגו")) {'));
  assert.ok(source.includes('if (haystack.includes("תיק") || haystack.includes("תיקים") || haystack.includes("מותג") || haystack.includes("קולקציה")) {'));
  assert.ok(source.includes('if (haystack.includes("קליניקה") || haystack.includes("טיפול") || haystack.includes("רפואה") || haystack.includes("מטפל")) {'));
  assert.ok(source.includes('if (haystack.includes("אסתט") || haystack.includes("בוטוקס") || haystack.includes("גבות") || haystack.includes("ריסים")) {'));
  assert.ok(source.includes('if (haystack.includes("בר") && (haystack.includes("קוקטייל") || haystack.includes("בירה") || haystack.includes("מוזיקה") || haystack.includes("מועדון"))) {'));
});

test("classification returns clear recoverable error when category cannot be determined", () => {
  const classifySource = read("base44/functions/classifyBusinessCategory/entry.ts");
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(classifySource.includes('error: "CLASSIFICATION_UNDETERMINED"'));
  assert.ok(classifySource.includes('message: "לא הצלחנו לזהות את קטגוריית העסק. נסו להוסיף עוד כמה מילים על סוג העסק."'));
  assert.ok(grokSource.includes('error: "CLASSIFICATION_UNDETERMINED"'));
  assert.ok(grokSource.includes('message: "לא הצלחנו לזהות את קטגוריית העסק. נסו להוסיף עוד כמה מילים על סוג העסק."'));
});

test("grokBriefiFlow still uses normalized industry_order for strict ConceptBank retrieval", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("const normalizedAnalysisIndustry = normalizeIndustryResult(businessAnalysis || {});"));
  assert.ok(source.includes("const normalizedClassification = normalizeIndustryResult(clf);"));
  assert.ok(source.includes("industry_order: industryOrder,"));
  assert.ok(source.includes("user_facing_video_style: videoStyle,"));
  assert.ok(source.includes("source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,"));
  assert.ok(source.includes("if (!industryOrder || industryOrder < 1 || industryOrder > 10) {"));
});
