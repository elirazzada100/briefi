import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("special focus route exists and video style picker navigates into it", () => {
  const app = read("src/App.jsx");
  const stylePicker = read("src/pages/VideoStylePicker.jsx");

  assert.ok(app.includes('path="/project/:projectId/special-focus"'));
  assert.ok(stylePicker.includes("navigate(`/project/${projectId}/special-focus`, {"));
  assert.ok(stylePicker.includes("...(state || {})"));
});

test("special focus page preserves incoming state and normalizes empty or trimmed text", () => {
  const specialFocus = read("src/pages/SpecialFocus.jsx");

  assert.ok(specialFocus.includes("function normalizeSpecialFocus(rawValue)"));
  assert.ok(specialFocus.includes('const text = (rawValue || "").trim()'));
  assert.ok(specialFocus.includes("enabled: text.length > 0"));
  assert.ok(specialFocus.includes("text,"));
  assert.ok(specialFocus.includes("...(state || {})"));
  assert.ok(specialFocus.includes("specialFocus: nextFocusState"));
  assert.ok(specialFocus.includes("navigate(`/project/${projectId}/grok-concepts`, {"));
  assert.ok(specialFocus.includes('navigateToConcepts({ enabled: false, text: "" })'));
});

test("special focus copy and buttons support optional empty and non-empty flow", () => {
  const specialFocus = read("src/pages/SpecialFocus.jsx");

  assert.ok(specialFocus.includes("יש משהו מיוחד שצריך להיכנס לסרטון?"));
  assert.ok(specialFocus.includes("המשך לקונספטים"));
  assert.ok(specialFocus.includes("המשך בלי משהו מיוחד"));
  assert.ok(specialFocus.includes("למשל: מבצע סוף שבוע על התיק הכחול החדש"));
});

test("concept screen remains reachable with preserved special focus state", () => {
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");

  assert.ok(conceptPicker.includes("const specialFocus = state?.specialFocus;"));
  assert.ok(conceptPicker.includes("specialFocus,"));
  assert.ok(conceptPicker.includes("businessAnalysis: resolvedAnalysis"));
  assert.ok(conceptPicker.includes("...(state || {})"));
  assert.ok(openingPicker.includes("const specialFocus = state?.specialFocus;"));
  assert.ok(openingPicker.includes("...(state || {})"));
  assert.ok(ctaPicker.includes("const specialFocus = state?.specialFocus;"));
  assert.ok(ctaPicker.includes("...(state || {})"));
});

test("special focus is passed into concept selection context only when non-empty", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("const { action, project_id, business, selectedConcept, selectedOpening, selectedBody, selectedCTA, selectedVideoStyle, businessAnalysis, specialFocus } = body;"));
  assert.ok(grokFlow.includes("const normalizedSpecialFocusText = specialFocus?.enabled && String(specialFocus?.text || \"\").trim()"));
  assert.ok(grokFlow.includes("Special focus: ${normalizedSpecialFocusText}"));
  assert.ok(grokFlow.includes("אם יש פוקוס מיוחד, התחשב בו בבחירת הקונספטים ובהסבר ההתאמה, אבל אל תמציא קונספטים מחוץ לבנק."));
});
