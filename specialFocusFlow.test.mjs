import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("special focus step exists after style and is free text only", () => {
  const styleSource = read("src/pages/VideoStylePicker.jsx");
  const focusSource = read("src/pages/SpecialFocus.jsx");
  const appSource = read("src/App.jsx");
  const stepperSource = read("src/components/briefi/BriefiStepper.jsx");

  assert.ok(styleSource.includes('navigate(`/project/${projectId}/special-focus`'));
  assert.ok(appSource.includes('path="/project/:projectId/special-focus"'));
  assert.ok(stepperSource.includes('const REGULAR_STEPS = ["סגנון", "פוקוס", "קונספט", "הוק", "CTA"]'));
  assert.ok(stepperSource.includes('const TRENDY_STEPS = ["סגנון", "פוקוס", "קונספט", "CTA"]'));
  assert.ok(focusSource.includes("יש משהו מיוחד שנכניס לסרטון?"));
  assert.ok(focusSource.includes("מה חשוב להכניס?"));
  assert.ok(focusSource.includes("לא, להמשיך רגיל"));
  assert.ok(focusSource.includes("להמשיך לקונספטים"));
  assert.ok(focusSource.includes('<BriefiStepper currentStep={2} isTrendy={selectedVideoStyle === "טרנדי"} />'));
  assert.ok(!focusSource.includes("briefi-chip"));
  assert.ok(!focusSource.includes("VIDEO_STYLES"));
});

test("style picker stays non-UGC and regular flow stays non-trendy", () => {
  const styleSource = read("src/pages/VideoStylePicker.jsx");
  const stepperSource = read("src/components/briefi/BriefiStepper.jsx");

  assert.ok(!styleSource.includes('id: "ugc"'));
  assert.ok(!styleSource.includes("UGC / המלצה"));
  assert.ok(!styleSource.includes("לא לשכוח קוד קופון!"));
  assert.ok(styleSource.includes('isTrendy={selected === "trendy" || selected === "טרנדי"}'));
  const trendyIndex = styleSource.indexOf('id: "טרנדי"');
  assert.ok(trendyIndex > -1);

  assert.ok(stepperSource.includes('const REGULAR_STEPS = ["סגנון", "פוקוס", "קונספט", "הוק", "CTA"]'));
  assert.ok(stepperSource.includes('"הוק"'));
});
test("special focus is saved into state and sent to concept generation", () => {
  const focusSource = read("src/pages/SpecialFocus.jsx");
  const conceptSource = read("src/pages/GrokConceptPicker.jsx");
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(focusSource.includes("const incomingState = state || {};"));
  assert.ok(focusSource.includes("const selectedVideoStyle = incomingState.selectedVideoStyle || incomingState.selectedStyle || incomingState.videoStyle;"));
  assert.ok(focusSource.includes("const buildFocusState = (value) => {"));
  assert.ok(focusSource.includes("const trimmed = value.trim();"));
  assert.ok(focusSource.includes("...incomingState,"));
  assert.ok(focusSource.includes("specialFocusText: trimmed"));
  assert.ok(focusSource.includes("specialFocusEnabled: false"));
  assert.ok(focusSource.includes("specialFocusEnabled: true"));
  assert.ok(focusSource.includes("const navigateToConcept = (value) => {"));
  assert.ok(focusSource.includes("navigate(`/project/${projectId}/grok-concepts`, {"));
  assert.ok(focusSource.includes("state: buildFocusState(value),"));
  assert.ok(focusSource.includes("onClick={() => navigateToConcept(specialFocusText)}"));
  assert.ok(focusSource.includes("onClick={() => navigateToConcept(\"\")}"));
  assert.ok(conceptSource.includes("const specialFocusText = state?.specialFocusText || \"\";"));
  assert.ok(conceptSource.includes("function normalizeSelectedVideoStyle(value) {"));
  assert.ok(conceptSource.includes('const selectedVideoStyle = normalizeSelectedVideoStyle('));
  assert.ok(conceptSource.includes("state?.selectedVideoStyle || state?.selectedStyle || state?.videoStyle"));
  assert.ok(conceptSource.includes("specialFocusEnabled,"));
  assert.ok(grokSource.includes("specialFocusText"));
  assert.ok(grokSource.includes("specialFocusEnabled"));
});

test("trendy flow skips hook and no standalone video-structure step remains in flow", () => {
  const conceptSource = read("src/pages/GrokConceptPicker.jsx");
  const openingSource = read("src/pages/GrokOpeningPicker.jsx");
  const ctaSource = read("src/pages/GrokCTAPicker.jsx");
  const grokSource = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(conceptSource.includes('const nextRoute = selectedVideoStyle === "טרנדי" ? "grok-cta" : "grok-opening";'));
  assert.ok(openingSource.includes('navigate(`/project/${projectId}/grok-cta`, {'));
  assert.ok(ctaSource.includes('const stepNumber = selectedVideoStyle === "טרנדי" ? 4 : 5;'));
  assert.ok(!conceptSource.includes('const nextRoute = selectedVideoStyle === "טרנדי" ? "grok-body" : "grok-opening";'));
  assert.ok(!openingSource.includes('navigate(`/project/${projectId}/grok-body`, {'));
  assert.ok(!conceptSource.includes("מבנה הסרטון"));
  assert.ok(grokSource.includes('Each concept must include: trend_name, opening_line, business_fit, why_it_fits, body_direction.'));
});

test("non-trendy hook step keeps regenerate and regenerate limit", () => {
  const openingSource = read("src/pages/GrokOpeningPicker.jsx");
  const stepperSource = read("src/components/briefi/BriefiStepper.jsx");

  assert.ok(openingSource.includes("יצירת הוקים חדשים"));
  assert.ok(openingSource.includes("לא נמצאה פתיחה מתאימה? אפשר לייצר סט חדש."));
  assert.ok(openingSource.includes("hookRegenerateCount"));
  assert.ok(openingSource.includes("hookRegenerateCount >= 3"));
  assert.ok(openingSource.includes("זה הסט האחרון לסרטון הזה. מומלץ לבחור את הפתיחה הקרובה ביותר ולהמשיך."));
  assert.ok(openingSource.includes("selectedConcept,"));
  assert.ok(openingSource.includes("specialFocusText"));
  assert.ok(stepperSource.includes('"הוק"'));
});

test("new flow remains gender-neutral and OpenAI stays unused", () => {
  const files = [
    "src/pages/VideoStylePicker.jsx",
    "src/pages/SpecialFocus.jsx",
    "src/pages/GrokConceptPicker.jsx",
    "src/pages/GrokOpeningPicker.jsx",
    "src/pages/GrokBodyPicker.jsx",
    "src/pages/GrokCTAPicker.jsx",
    "base44/functions/grokBriefiFlow/entry.ts",
  ];

  const forbiddenGenderedWords = ["תבחרי", "כתבי", "הכניסי", "פתחי", "אהבת", "תמשיכי"];

  for (const file of files) {
    const source = read(file);
    for (const word of forbiddenGenderedWords) {
      assert.ok(!source.includes(word), `${file} contains gendered copy: ${word}`);
    }
    assert.ok(!source.includes("npm:openai"), `${file} should not import OpenAI`);
  }
});

test("final brief hides the stepper while earlier creation pages keep it", () => {
  const finalBriefSource = read("src/pages/FinalBrief.jsx");
  const focusSource = read("src/pages/SpecialFocus.jsx");
  const conceptSource = read("src/pages/GrokConceptPicker.jsx");

  assert.ok(!finalBriefSource.includes("BriefiStepper"));
  assert.ok(focusSource.includes("BriefiStepper"));
  assert.ok(conceptSource.includes("BriefiStepper"));
});
