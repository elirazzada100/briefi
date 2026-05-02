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

test("Grok-first pages do not call legacy OpenAI functions", () => {
  const files = [
    "src/pages/CreativeDNA.jsx",
    "src/pages/GrokConceptPicker.jsx",
    "src/pages/GrokBodyPicker.jsx",
    "src/pages/GrokOpeningPicker.jsx",
    "src/pages/GrokCTAPicker.jsx",
    "base44/functions/grokBriefiFlow/entry.ts",
  ];

  for (const file of files) {
    const source = read(file);
    assert.ok(!source.includes("briefiAI"), `${file} references briefiAI`);
    assert.ok(!source.includes("generateConceptsFromHookBank"), `${file} references generateConceptsFromHookBank`);
    assert.ok(!source.includes("OPENAI_API_KEY"), `${file} references OPENAI_API_KEY`);
    assert.ok(!source.includes("npm:openai"), `${file} imports OpenAI`);
    assert.ok(!source.includes("gpt-4o"), `${file} references OpenAI model names`);
  }
});
