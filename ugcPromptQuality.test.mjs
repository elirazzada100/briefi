import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("UGC-specific prompt guidance exists only as conditional ugc branches", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('const UGC_CONCEPT_GUIDANCE = `UGC-SPECIFIC GUIDANCE:'));
  assert.ok(source.includes('const UGC_OPENING_GUIDANCE = `UGC HOOK GUIDANCE:'));
  assert.ok(source.includes('const UGC_CTA_GUIDANCE = `UGC CTA GUIDANCE:'));
  assert.ok(source.includes('const UGC_FINAL_BRIEF_GUIDANCE = `UGC FINAL BRIEF GUIDANCE:'));
  assert.ok(source.includes('const isUGC = videoStyle === "ugc";'));
  assert.ok(source.includes('const ugcConceptContext = isUGC ?'));
  assert.ok(source.includes('${UGC_CONCEPT_GUIDANCE}'));
  assert.ok(source.includes('const ugcOpeningContext = isUGC ?'));
  assert.ok(source.includes('${UGC_OPENING_GUIDANCE}'));
  assert.ok(source.includes('const ugcCTAContext = isUGC ?'));
  assert.ok(source.includes('${UGC_CTA_GUIDANCE}'));
  assert.ok(source.includes('const ugcFinalBriefContext = isUGC ?'));
  assert.ok(source.includes('${UGC_FINAL_BRIEF_GUIDANCE}'));
});

test("UGC guidance references built_in_hook, body_template, cta_template, filming_style and hero focus", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("built_in_hook"));
  assert.ok(source.includes("body_template"));
  assert.ok(source.includes("cta_template"));
  assert.ok(source.includes("filming_style"));
  assert.ok(source.includes("treat it as the hero focus"));
  assert.ok(source.includes('Special focus / hero focus: ${specialFocusText}'));
});

test("non-UGC and trendy behavior stay isolated from UGC guidance", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('if (videoStyle === "טרנדי") {'));
  assert.ok(!source.includes('if (videoStyle === "טרנדי") {\n        const ugc'));
  assert.ok(source.includes('const videoStyle = selectedVideoStyle || "מצחיק";'));
  assert.ok(source.includes('const isUGC = (selectedVideoStyle || "") === "ugc";'));
});
