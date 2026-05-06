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
