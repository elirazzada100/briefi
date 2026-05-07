import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("briefiAI no longer imports or references OpenAI", () => {
  const source = read("base44/functions/briefiAI/entry.ts");
  assert.ok(!source.includes("OpenAI"));
  assert.ok(!source.includes("OPENAI_API_KEY"));
  assert.ok(!source.includes("gpt-4o"));
  assert.ok(source.includes("LEGACY_OPENAI_FLOW_DEPRECATED"));
});

test("generateConceptsFromHookBank no longer imports or references OpenAI", () => {
  const source = read("base44/functions/generateConceptsFromHookBank/entry.ts");
  assert.ok(!source.includes("OpenAI"));
  assert.ok(!source.includes("OPENAI_API_KEY"));
  assert.ok(!source.includes("gpt-4o"));
  assert.ok(source.includes("LEGACY_HOOKBANK_FLOW_DEPRECATED"));
});

test("PDF export does not call legacy OpenAI function", () => {
  const source = read("src/pages/PDFExport.jsx");
  assert.ok(!source.includes("briefiAI"));
  assert.ok(!source.includes("generateClientBriefSummary"));
});

test("legacy OpenAI freeform functions remain deprecated while approved OpenAI usage exists only in current published flow", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");
  const creativeDNA = read("src/pages/CreativeDNA.jsx");

  [creativeDNA, conceptPicker, openingPicker, ctaPicker, grokFlow].forEach((source, index) => {
    const label = ["CreativeDNA", "GrokConceptPicker", "GrokOpeningPicker", "GrokCTAPicker", "grokBriefiFlow"][index];
    assert.ok(!source.includes("briefiAI"), `${label} references briefiAI`);
    assert.ok(!source.includes("generateConceptsFromHookBank"), `${label} references generateConceptsFromHookBank`);
    assert.ok(!source.includes("gpt-4o"), `${label} references old OpenAI model names`);
  });

  assert.ok(grokFlow.includes("OPENAI_API_KEY"));
  assert.ok(grokFlow.includes("callOpenAIForConcepts"));
  assert.ok(grokFlow.includes("classifyWithOpenAI"));
  assert.ok(grokFlow.includes("assembleFinalBrief"));
  assert.ok(grokFlow.includes('provider_used: "openai"'));
  assert.ok(grokFlow.includes('step_name: "final_brief"'));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes('step_name: "opening_grok"'));
  assert.ok(grokFlow.includes('source_type: "grok_generated"'));
  assert.ok(grokFlow.includes('step_name: "cta"'));
});
