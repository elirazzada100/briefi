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

test("UGC style is visible, uses internal key ugc, and routes into Special Focus", () => {
  const stylePicker = read("src/pages/VideoStylePicker.jsx");

  const ugcIndex = stylePicker.indexOf('label: "UGC / המלצה"');
  const trendyIndex = stylePicker.indexOf('label: "טרנדי"');

  assert.ok(ugcIndex !== -1);
  assert.ok(trendyIndex !== -1);
  assert.ok(ugcIndex < trendyIndex);
  assert.ok(stylePicker.includes('id: "ugc"'));
  assert.ok(stylePicker.includes("רק לא לשכוח קוד קופון!"));
  assert.ok(!stylePicker.includes("סרטון שנראה כמו המלצה אמיתית, עדות אישית או חוויה טבעית עם המוצר."));
  assert.ok(!stylePicker.includes("לא לשכוח קוד קופון אם יש."));
  assert.ok(stylePicker.includes("navigate(`/project/${projectId}/special-focus`, {"));
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

test("UGC flow preserves style and does not skip hook", () => {
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");

  assert.ok(conceptPicker.includes("selectedVideoStyle,"));
  assert.ok(conceptPicker.includes("navigate(`/project/${projectId}/grok-opening`, {"));
  assert.ok(openingPicker.includes("selectedVideoStyle"));
  assert.ok(openingPicker.includes("navigate(`/project/${projectId}/grok-cta`, {"));
  assert.ok(ctaPicker.includes("selectedVideoStyle"));
});

test("special focus is passed into concept selection context only when non-empty", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("const { action, project_id, business, selectedConcept, selectedOpening, selectedBody, selectedCTA, selectedVideoStyle, businessAnalysis, specialFocus } = body;"));
  assert.ok(grokFlow.includes("const normalizedSpecialFocusText = specialFocus?.enabled && String(specialFocus?.text || \"\").trim()"));
  assert.ok(grokFlow.includes("Special focus: ${normalizedSpecialFocusText}"));
  assert.ok(grokFlow.includes("אם יש פוקוס מיוחד, התחשב בו בבחירת הקונספטים ובהסבר ההתאמה, אבל אל תמציא קונספטים מחוץ לבנק."));
  assert.ok(grokFlow.includes('const UGC_CONCEPT_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean_v2"'));
  assert.ok(grokFlow.includes('const UGC_STYLE = "ugc"'));
  assert.ok(grokFlow.includes("function buildUGCPovInstruction()"));
  assert.ok(grokFlow.includes('Forbidden business POV phrases: "אנחנו", "אצלנו", "הכנו לכם", "בואו אלינו", "המוצר שלנו", "השירות שלנו", "הצוות שלנו", "לקוחות שלנו"'));
  assert.ok(grokFlow.includes('Preferred framing: "ניסיתי את...", "לקחתי את...", "הגעתי ל...", "לא ציפיתי ש...", "אחרי יום עם זה...", "זה הרגיש לי...", "מה שאהבתי בזה...", "אם אתם מחפשים... שווה לבדוק", "לא פרסומת, פשוט חוויה שעבדה לי".'));
});
