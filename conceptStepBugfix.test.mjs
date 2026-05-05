import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("focus to concept preserves selected style and handles empty or non-empty focus safely", () => {
  const focusSource = read("src/pages/SpecialFocus.jsx");
  const conceptSource = read("src/pages/GrokConceptPicker.jsx");

  assert.ok(focusSource.includes("selectedVideoStyle,"));
  assert.ok(focusSource.includes("businessAnalysis,"));
  assert.ok(focusSource.includes("specialFocusText: trimmed"));
  assert.ok(focusSource.includes("specialFocusEnabled: Boolean(trimmed)"));
  assert.ok(focusSource.includes("specialFocusText: \"\""));
  assert.ok(focusSource.includes("specialFocusEnabled: false"));

  assert.ok(conceptSource.includes('const specialFocusText = state?.specialFocusText || "";'));
  assert.ok(conceptSource.includes("const specialFocusEnabled = Boolean(state?.specialFocusEnabled && specialFocusText.trim());"));
  assert.ok(conceptSource.includes("selectedVideoStyle,"));
  assert.ok(conceptSource.includes("specialFocusText,"));
  assert.ok(conceptSource.includes("specialFocusEnabled,"));
});

test("concept retrieval no longer uses the extra classify fetch hop and keeps batch rules", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(!source.includes("const classifyRaw = await fetch("));
  assert.ok(source.includes('const conceptSourceBatch = videoStyle === "ugc"'));
  assert.ok(source.includes('? UGC_CONCEPT_SOURCE_BATCH'));
  assert.ok(source.includes(': ACTIVE_CONCEPT_SOURCE_BATCH;'));
  assert.ok(source.includes('if (videoStyle === "טרנדי") {'));
});

test("creation-flow UI files do not keep artificial delays above 500ms", () => {
  const files = [
    "src/pages/VideoStylePicker.jsx",
    "src/pages/SpecialFocus.jsx",
    "src/pages/GrokConceptPicker.jsx",
    "src/pages/GrokOpeningPicker.jsx",
    "src/pages/GrokCTAPicker.jsx",
    "src/pages/FinalBrief.jsx",
  ];

  for (const file of files) {
    const source = read(file);
    const matches = [...source.matchAll(/setTimeout\s*\([^,]+,\s*(\d+)\s*\)/g)];
    for (const match of matches) {
      assert.ok(Number(match[1]) <= 500, `${file} has artificial delay above 500ms: ${match[1]}`);
    }
  }
});
