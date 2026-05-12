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
  assert.ok(source.includes("frontend_generate_dna_ms"));
  assert.ok(source.includes("frontend_request_started_at"));
  assert.ok(source.includes("frontend_request_finished_at"));
  assert.ok(source.includes('console.debug("[creative-dna-timing]"'));
  assert.ok(source.includes("תזמון ניתוח עסק"));
  assert.ok(source.includes("העתק תזמון"));
  assert.ok(source.includes("navigator.clipboard.writeText"));
  assert.ok(source.includes('window.localStorage?.getItem("briefiDebugTiming") === "true"'));
  assert.ok(source.includes("try {"));
  assert.ok(source.includes("showTimingDebug = false;"));
  assert.ok(source.includes("requestInFlightRef.current = false;"));
  assert.ok(source.includes("setGenerating(false);"));
  assert.ok(!source.includes("setTimeout"));
});

test("generateCreativeDNA timing instrumentation is safe and returns through bounded timeout and fallback paths", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("async function callWithFallback(systemPrompt, userPrompt, temperature = 0.7)"));
  assert.ok(source.includes("async function callGrokWithTimeoutAndMetrics(systemPrompt, userPrompt, temperature = 0.7, timeoutMs = GROK_CREATIVE_DNA_TIMEOUT_MS)"));
  assert.ok(source.includes("const GROK_CREATIVE_DNA_TIMEOUT_MS = 11000"));
  assert.ok(source.includes("const OPENAI_CREATIVE_DNA_TIMEOUT_MS = 12000"));
  assert.ok(source.includes("AbortController()"));
  assert.ok(source.includes("generate_creative_dna_total_ms"));
  assert.ok(source.includes("provider_roundtrip_ms"));
  assert.ok(source.includes("parse_ms"));
  assert.ok(source.includes("attempt_count"));
  assert.ok(source.includes("retry_used"));
  assert.ok(source.includes("project_update_ms"));
  assert.ok(source.includes("GROK_TIMEOUT_${timeoutMs}ms"));
  assert.ok(source.includes("OPENAI_TIMEOUT_${timeoutMs}ms"));
  assert.ok(source.includes("fallback_used"));
  assert.ok(source.includes("fallback_provider"));
  assert.ok(source.includes("fallback_model"));
  assert.ok(source.includes("grok_timeout_ms"));
  assert.ok(source.includes("fallback_timeout_ms"));
  assert.ok(source.includes("fallback_timed_out"));
  assert.ok(source.includes("returned_safe_minimal_response"));
  assert.ok(source.includes("buildSafeMinimalCreativeDNA"));
  assert.ok(source.includes("model: XAI_MODEL"));
  assert.ok(source.includes("provider,"));
  assert.ok(!source.includes("_debug: { systemPrompt"));
  assert.ok(!source.includes("_debug: { userPrompt"));
  assert.ok(!source.includes("_debug: { raw"));
});

test("creative DNA timing panel renders only when timingDebug exists and copies safe timing fields only", () => {
  const creativeDNA = read("src/pages/CreativeDNA.jsx");

  assert.ok(creativeDNA.includes("{timingDebug && showTimingDebug && ("));
  assert.ok(creativeDNA.includes("תזמון ניתוח עסק"));
  assert.ok(creativeDNA.includes("העתק תזמון"));
  assert.ok(creativeDNA.includes("Business Analysis timing:"));
  assert.ok(creativeDNA.includes("frontend_generate_dna_ms"));
  assert.ok(creativeDNA.includes("generate_creative_dna_total_ms"));
  assert.ok(creativeDNA.includes("provider_roundtrip_ms"));
  assert.ok(creativeDNA.includes("parse_ms"));
  assert.ok(creativeDNA.includes("attempt_count"));
  assert.ok(creativeDNA.includes("retry_used"));
  assert.ok(creativeDNA.includes("project_update_ms"));
  assert.ok(creativeDNA.includes("provider"));
  assert.ok(creativeDNA.includes("model"));
  assert.ok(!creativeDNA.includes("systemPrompt"));
  assert.ok(!creativeDNA.includes("userPrompt"));
  assert.ok(!creativeDNA.includes("OPENAI_API_KEY"));
  assert.ok(!creativeDNA.includes("XAI_API_KEY"));
  assert.ok(!creativeDNA.includes("raw provider response"));
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
  assert.ok(source.includes("conceptbank_retrieval_ms"));
  assert.ok(source.includes("openai_selection_ms"));
  assert.ok(source.includes("total_ms"));
  assert.ok(source.includes("candidate_count"));
  assert.ok(source.includes("source_batch: conceptSourceBatch"));
  assert.ok(source.includes("is_ugc: policy.isUGC"));
  assert.ok(source.includes("is_trendy: policy.isTrendy"));
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
  assert.ok(conceptPicker.includes("frontend_concept_total_ms"));
  assert.ok(conceptPicker.includes("frontend_classification_ms"));
  assert.ok(conceptPicker.includes("frontend_generate_concepts_ms"));
  assert.ok(conceptPicker.includes("classification_skipped"));
  assert.ok(conceptPicker.includes('console.debug("[concept-timing]"'));
  assert.ok(conceptPicker.includes('new URLSearchParams(location.search).get("debugTiming") === "1"'));
  assert.ok(conceptPicker.includes('window.localStorage?.getItem("briefiDebugTiming") === "true"'));
  assert.ok(conceptPicker.includes("תזמון קונספטים"));
  assert.ok(conceptPicker.includes("העתק תזמון"));
  assert.ok(conceptPicker.includes("navigator.clipboard.writeText"));

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
  assert.ok(!read("src/pages/GrokConceptPicker.jsx").includes("setTimeout"));
});

test("concept timing preview panel is gated and copies safe timing fields only", () => {
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");

  assert.ok(conceptPicker.includes("debugTimingEnabled && timingDebug"));
  assert.ok(!conceptPicker.includes("business_description: ${"));
  assert.ok(!conceptPicker.includes("systemPrompt"));
  assert.ok(!conceptPicker.includes("userPrompt"));
  assert.ok(!conceptPicker.includes("OPENAI_API_KEY"));
  assert.ok(!conceptPicker.includes("XAI_API_KEY"));
  assert.ok(conceptPicker.includes("selected_style:"));
  assert.ok(conceptPicker.includes("candidate_count:"));
  assert.ok(conceptPicker.includes("source_batch:"));
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
