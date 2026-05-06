import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("empty focus path normalizes immediately and does not create fake focus", () => {
  const focusSource = read("src/pages/SpecialFocus.jsx");

  assert.ok(focusSource.includes("const buildFocusState = (value) => {"));
  assert.ok(focusSource.includes("const trimmed = value.trim();"));
  assert.ok(focusSource.includes("specialFocusText: trimmed"));
  assert.ok(focusSource.includes("specialFocusEnabled: false"));
  assert.ok(focusSource.includes("specialFocusEnabled: true"));
  assert.ok(focusSource.includes("state: buildFocusState(specialFocusText)"));
  assert.ok(focusSource.includes("state: buildFocusState(\"\")"));
});

test("empty focus to concept avoids duplicate client-side work", () => {
  const conceptSource = read("src/pages/GrokConceptPicker.jsx");
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(conceptSource.includes("const requestedFlowKeyRef = useRef(null);"));
  assert.ok(conceptSource.includes("requestedFlowKeyRef.current !== flowKey"));
  assert.ok(!conceptSource.includes('base44.functions.invoke("classifyBusinessCategory"'));
  assert.ok(!conceptSource.includes("base44.functions.invoke('classifyBusinessCategory'"));
  assert.ok(grokSource.includes('classifiedIndustry: { industry_order: industryOrder, industry_name: industryName }'));
});

test("empty focus to concept UI path has no artificial delay above 100ms", () => {
  const files = [
    "src/pages/SpecialFocus.jsx",
    "src/pages/GrokConceptPicker.jsx",
  ];

  for (const file of files) {
    const source = read(file);
    const matches = [...source.matchAll(/setTimeout\s*\([^,]+,\s*(\d+)\s*\)/g)];
    for (const match of matches) {
      assert.ok(Number(match[1]) <= 100, `${file} has artificial delay above 100ms: ${match[1]}`);
    }
  }
});
