import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("business analysis page blocks duplicate generation and has no artificial delay", () => {
  const source = read("src/pages/CreativeDNA.jsx");
  assert.ok(source.includes("requestInFlightRef"));
  assert.ok(source.includes("generationStartedRef"));
  assert.ok(source.includes('action: "generateCreativeDNA"'));
  assert.ok(!source.includes("setTimeout"));
});

test("active creation pages keep artificial delays at or below 100ms", () => {
  const specialFocus = read("src/pages/SpecialFocus.jsx");
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");
  const finalBrief = read("src/pages/FinalBrief.jsx");

  for (const source of [specialFocus, conceptPicker, openingPicker, ctaPicker]) {
    assert.ok(!source.includes("setTimeout"), "active flow page should not add artificial delay");
  }

  assert.ok(finalBrief.includes("setTimeout(() => setSaved(false), 100)"));
  assert.ok(!finalBrief.includes("setTimeout(() => setSaved(false), 2000)"));
});

test("concept flow removes duplicate classification wait and guards duplicate requests", () => {
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(conceptPicker.includes("initialLoadStartedRef"));
  assert.ok(conceptPicker.includes("requestInFlightRef"));
  assert.ok(!conceptPicker.includes('functions.invoke("classifyBusinessCategory"'));
  assert.ok(grokFlow.includes('const classifyRes = await base44.asServiceRole.functions.invoke("classifyBusinessCategory"'));
  assert.ok(!grokFlow.includes("const classifyRaw = await fetch"));
});

test("opening, CTA, and final brief loading paths guard duplicate work", () => {
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");
  const finalBrief = read("src/pages/FinalBrief.jsx");

  assert.ok(openingPicker.includes("initialLoadStartedRef"));
  assert.ok(openingPicker.includes("requestInFlightRef"));
  assert.ok(ctaPicker.includes("initialLoadStartedRef"));
  assert.ok(ctaPicker.includes("requestInFlightRef"));
  assert.ok(ctaPicker.includes("if (generatingBrief) return;"));
  assert.ok(finalBrief.includes("initialLoadStartedRef"));
});

test("loading components rotate at 3 seconds and keep text narrow/centered", () => {
  const sharedLoader = read("src/components/shared/BriefiLoader.jsx");
  const sharedState = read("src/components/shared/LoadingState.jsx");
  const briefiState = read("src/components/briefi/LoadingState.jsx");

  assert.ok(sharedLoader.includes("rotateMs = 3000"));
  assert.ok(sharedState.includes("rotateMs = 3000"));
  assert.ok(briefiState.includes("rotateMs = 3000"));
  assert.ok(sharedLoader.includes("max-w-[260px]"));
  assert.ok(sharedState.includes("max-w-[260px]"));
  assert.ok(briefiState.includes("max-w-[260px]"));
});

test("active Grok loading screens use short non-technical copy", () => {
  const creativeDNA = read("src/pages/CreativeDNA.jsx");
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");
  const bodyPicker = read("src/pages/GrokBodyPicker.jsx");
  const finalBrief = read("src/pages/FinalBrief.jsx");

  assert.ok(creativeDNA.includes('["קוראים את העסק.", "מחפשים את הזווית שתעצור גלילה."]'));
  assert.ok(conceptPicker.includes('["מסדרים רעיונות.", "בוחרים את אלה שיש להם סיכוי לעבוד באמת."]'));
  assert.ok(openingPicker.includes('["כותבים פתיחה.", "משפט ראשון טוב עושה חצי עבודה."]'));
  assert.ok(ctaPicker.includes('["מסדרים סיום.", "לא כל סרטון צריך לצעוק ‘תקנו עכשיו’."]'));
  assert.ok(ctaPicker.includes('["בונים את הסרטון.", "עוד רגע יש לך משהו שאפשר לצלם."]'));
  assert.ok(bodyPicker.includes('["מסדרים רעיונות.", "עוד רגע זה מוכן."]'));
  assert.ok(finalBrief.includes('["בונים את הסרטון.", "עוד רגע יש לך משהו שאפשר לצלם."]'));
});
