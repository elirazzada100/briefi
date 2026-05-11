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

test("concept flow keeps strict ConceptBank retrieval while using the current OpenAI-backed classification and selection path", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("classifyWithOpenAI"));
  assert.ok(source.includes("selectConceptsWithOpenAI"));
  assert.ok(source.includes("function resolveStylePolicy(selectedStyle)"));
  assert.ok(source.includes("const conceptSourceBatch = policy.sourceBatch"));
  assert.ok(source.includes('source_batch: conceptSourceBatch'));
  assert.ok(source.includes("industry_order: industryOrder"));
  assert.ok(source.includes("user_facing_video_style: conceptStyle"));
  assert.ok(source.includes('source_type: "concept_bank"'));
  assert.ok(source.includes("candidateIdSet"));
  assert.ok(source.includes('provider_log: { provider_used: "openai", step_name: "concept_bank_strict", success: true }'));
});

test("concept, hook, CTA, and final brief add duplicate request guards without changing state handoff", () => {
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const openingPicker = read("src/pages/GrokOpeningPicker.jsx");
  const ctaPicker = read("src/pages/GrokCTAPicker.jsx");
  const finalBrief = read("src/pages/FinalBrief.jsx");

  assert.ok(conceptPicker.includes("initialLoadStartedRef"));
  assert.ok(conceptPicker.includes("requestInFlightRef"));
  assert.ok(conceptPicker.includes("selectedVideoStyle,"));
  assert.ok(conceptPicker.includes("businessAnalysis: resolvedAnalysis"));

  assert.ok(openingPicker.includes("initialLoadStartedRef"));
  assert.ok(openingPicker.includes("requestInFlightRef"));

  assert.ok(ctaPicker.includes("initialLoadStartedRef"));
  assert.ok(ctaPicker.includes("requestInFlightRef"));
  assert.ok(ctaPicker.includes("if (generatingBrief) return;"));

  assert.ok(finalBrief.includes("initialLoadStartedRef"));
});

test("FinalBrief post-save timer is at most 100ms", () => {
  const source = read("src/pages/FinalBrief.jsx");
  assert.ok(source.includes("setTimeout(() => setSaved(false), 100)"));
  assert.ok(!source.includes("setTimeout(() => setSaved(false), 2000)"));
});

test("FinalBrief uses OpenAI assembly plus bounded Grok polish fallback", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("FINAL_BRIEF_POLISH_SYSTEM"));
  assert.ok(source.includes("callWithFallbackTimeout"));
  assert.ok(source.includes("const polishTimeoutMs = 12000"));
  assert.ok(source.includes("openai_assemble_used: true"));
  assert.ok(source.includes("grok_polish_attempted"));
  assert.ok(source.includes("grok_polish_applied"));
  assert.ok(source.includes("grok_polish_failed_reason"));
  assert.ok(source.includes("let finalBrief = sanitizeFinalBriefUserFacingFields(parsed);"));
  assert.ok(source.includes("finalBrief = sanitizeFinalBriefUserFacingFields(mergePolishedFinalBrief(finalBrief, polishedFields));"));
  assert.ok(source.includes("final_brief: finalBrief"));
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
