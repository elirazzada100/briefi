import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");
const REGULAR_BATCH = "1000_Concepts_Briefi_10_display_clean";
const UGC_V2_BATCH = "1000_UGC_Briefi_10_display_clean_v2";
const OLD_UGC_BATCH = "1000_UGC_Briefi_10_display_clean";

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("grokBriefiFlow locks source batch constants and old UGC batch stays outside runtime path", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes(`const ACTIVE_CONCEPT_SOURCE_BATCH = "${REGULAR_BATCH}"`));
  assert.ok(grokFlow.includes(`const UGC_CONCEPT_SOURCE_BATCH = "${UGC_V2_BATCH}"`));
  assert.ok(!grokFlow.includes(`"${OLD_UGC_BATCH}"`));
  assert.ok(grokFlow.includes("function resolveStylePolicy(selectedStyle)"));
  assert.ok(grokFlow.includes("sourceBatch,"));
  assert.ok(grokFlow.includes("source_batch: conceptSourceBatch"));
  assert.ok(grokFlow.includes("user_facing_video_style: conceptStyle"));
});

test("grokBriefiFlow locks style branching: UGC is bank-backed and Trendy stays separate", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes('const UGC_STYLE = "ugc"'));
  assert.ok(grokFlow.includes('const REGULAR_BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"]'));
  assert.ok(grokFlow.includes("const BANK_STYLES = [...REGULAR_BANK_STYLES, UGC_STYLE]"));
  assert.ok(grokFlow.includes("const isTrendy = normalizedStyle === \"טרנדי\";"));
  assert.ok(grokFlow.includes("if (policy.isTrendy) {"));
  assert.ok(grokFlow.includes("TrendPattern.filter({ is_active: true })"));
  assert.ok(grokFlow.includes('provider_log: { provider_used: provider, step_name: "concept_trendy", success: true }'));
  assert.ok(grokFlow.includes("const isBankBacked = BANK_STYLES.includes(normalizedStyle);"));
  assert.ok(grokFlow.includes("if (!policy.isBankBacked) {"));
  assert.ok(!grokFlow.includes('videoStyle === "טרנדי" ? UGC_STYLE'));
});

test("grokBriefiFlow locks special focus normalization and prompt behavior", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("specialFocus } = body;"));
  assert.ok(grokFlow.includes("const normalizedSpecialFocusText = specialFocus?.enabled && String(specialFocus?.text || \"\").trim()"));
  assert.ok(grokFlow.includes("? String(specialFocus.text).trim()"));
  assert.ok(grokFlow.includes(': "";'));
  assert.ok(grokFlow.includes("Special focus: ${normalizedSpecialFocusText}"));
  assert.ok(grokFlow.includes("אם יש פוקוס מיוחד, התחשב בו בבחירת הקונספטים ובהסבר ההתאמה, אבל אל תמציא קונספטים מחוץ לבנק."));
});

test("grokBriefiFlow locks UGC POV rules as conditional ugc-only prompt context", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("function buildUGCPovInstruction()"));
  assert.ok(grokFlow.includes("customer, user, creator, or someone outside the business who tried it"));
  assert.ok(grokFlow.includes('Forbidden business POV phrases: "אנחנו", "אצלנו", "הכנו לכם", "בואו אלינו", "המוצר שלנו", "השירות שלנו", "הצוות שלנו", "לקוחות שלנו"'));
  assert.ok(grokFlow.includes('Preferred framing: "ניסיתי את...", "לקחתי את...", "הגעתי ל...", "לא ציפיתי ש...", "אחרי יום עם זה...", "זה הרגיש לי...", "מה שאהבתי בזה...", "אם אתם מחפשים... שווה לבדוק", "לא פרסומת, פשוט חוויה שעבדה לי".'));
  assert.ok(grokFlow.includes("ugcPovRequired: isUGC,"));
  assert.ok(grokFlow.includes('const ugcPovInstruction = policy.ugcPovRequired ? buildUGCPovInstruction() : "";'));
});

test("resolveStylePolicy locks UGC, regular, and trendy behavior without changing batch values", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("function resolveStylePolicy(selectedStyle)"));
  assert.ok(grokFlow.includes('const rawStyle = selectedStyle || "מצחיק";'));
  assert.ok(grokFlow.includes("const normalizedStyle = rawStyle;"));
  assert.ok(grokFlow.includes("const isUGC = normalizedStyle === UGC_STYLE;"));
  assert.ok(grokFlow.includes("const isTrendy = normalizedStyle === \"טרנדי\";"));
  assert.ok(grokFlow.includes("const isBankBacked = BANK_STYLES.includes(normalizedStyle);"));
  assert.ok(grokFlow.includes("const sourceBatch = isUGC"));
  assert.ok(grokFlow.includes("UGC_CONCEPT_SOURCE_BATCH"));
  assert.ok(grokFlow.includes("ACTIVE_CONCEPT_SOURCE_BATCH"));
  assert.ok(grokFlow.includes("const conceptStyle = isUGC ? UGC_STYLE : normalizedStyle;"));
  assert.ok(grokFlow.includes("shouldSkipHook: false,"));
  assert.ok(grokFlow.includes("usesSpecialFocus: !isTrendy,"));
  assert.ok(grokFlow.includes("ugcPovRequired: isUGC,"));
});

test("grokBriefiFlow locks provider split across classification, concepts, hook, CTA, and final brief", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("async function callOpenAIForConcepts"));
  assert.ok(grokFlow.includes("async function classifyWithOpenAI"));
  assert.ok(grokFlow.includes("async function selectConceptsWithOpenAI"));
  assert.ok(grokFlow.includes("const TRENDY_SYSTEM = `You are Briefi Concept Generator"));
  assert.ok(grokFlow.includes("await callWithFallback(OPENING_GEN_GROK_SYSTEM"));
  assert.ok(grokFlow.includes("await callWithFallback(CTA_GEN_SYSTEM"));
  assert.ok(grokFlow.includes('step_name: "opening_grok"'));
  assert.ok(grokFlow.includes('step_name: "cta"'));
  assert.ok(grokFlow.includes('provider_log: { provider_used: "openai", step_name: "concept_bank_strict", success: true }'));
  assert.ok(grokFlow.includes('provider_used: "openai"'));
  assert.ok(grokFlow.includes('step_name: "final_brief"'));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("await callWithFallbackTimeout("));
});

test("grokBriefiFlow locks candidate-pool validation and no-freeform bank concept behavior", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("const candidateIdSet = new Set(pool.map(c => c.id));"));
  assert.ok(grokFlow.includes('Do NOT invent new concepts. Do NOT use concepts from outside the pool.'));
  assert.ok(grokFlow.includes('source_concept_id MUST be an exact ID from the pool list provided.'));
  assert.ok(grokFlow.includes('if (!c.concept_bank_id || !candidateIdSet.has(c.concept_bank_id))'));
  assert.ok(grokFlow.includes('error: "OPENAI_CONCEPT_SELECTION_VALIDATION_FAILED"'));
  assert.ok(grokFlow.includes('source_type: "concept_bank"'));
});

test("grokBriefiFlow concept debug stays timing-focused and does not expose prompts secrets or raw provider text", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("conceptbank_retrieval_ms"));
  assert.ok(grokFlow.includes("openai_selection_ms"));
  assert.ok(grokFlow.includes("candidate_count"));
  assert.ok(grokFlow.includes("source_batch: conceptSourceBatch"));
  assert.ok(grokFlow.includes("is_ugc: policy.isUGC"));
  assert.ok(grokFlow.includes("is_trendy: policy.isTrendy"));
  assert.ok(!grokFlow.includes("_debug: { prompt"));
  assert.ok(!grokFlow.includes("_debug: { systemPrompt"));
  assert.ok(!grokFlow.includes("_debug: { userPrompt"));
  assert.ok(!grokFlow.includes("_debug: { rawContent"));
  assert.ok(!grokFlow.includes("_debug: { OPENAI_API_KEY"));
  assert.ok(!grokFlow.includes("_debug: { XAI_API_KEY"));
  assert.ok(!grokFlow.includes("debugData.OPENAI_API_KEY"));
  assert.ok(!grokFlow.includes("debugData.XAI_API_KEY"));
});

test("grokBriefiFlow locks dash sanitizer scope to user-facing fields, not ids or batch keys", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes("function sanitizeUserFacingHebrewCopy(value)"));
  assert.ok(grokFlow.includes("function sanitizeConceptCards(concepts)"));
  assert.ok(grokFlow.includes("function sanitizeOpeningOptions(openingOptions)"));
  assert.ok(grokFlow.includes("function sanitizeCTAOptions(ctaOptions)"));
  assert.ok(grokFlow.includes("function sanitizeFinalBriefUserFacingFields(finalBrief)"));
  assert.ok(grokFlow.includes("concept_title: sanitizeUserFacingHebrewCopy"));
  assert.ok(grokFlow.includes("opening_line: sanitizeUserFacingHebrewCopy"));
  assert.ok(grokFlow.includes("cta_text: sanitizeUserFacingHebrewCopy"));
  assert.ok(grokFlow.includes("brief_title: sanitizeUserFacingHebrewCopy"));
  assert.ok(!grokFlow.includes("concept_bank_id: sanitizeUserFacingHebrewCopy"));
  assert.ok(!grokFlow.includes("source_batch: sanitizeUserFacingHebrewCopy"));
});

test("grokBriefiFlow locks hybrid final brief flow and field contract", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes('if (action === "assembleFinalBrief") {'));
  assert.ok(grokFlow.includes("const finalBriefSystemPrompt = isLimdi"));
  assert.ok(grokFlow.includes('Assemble the brief now. hook = opening line verbatim.'));
  assert.ok(grokFlow.includes("const polishPayload = buildFinalBriefPolishPayload(finalBrief);"));
  assert.ok(grokFlow.includes("const polishProviderLog = {"));
  assert.ok(grokFlow.includes("grok_polish_attempted: false"));
  assert.ok(grokFlow.includes("grok_polish_applied: false"));
  assert.ok(grokFlow.includes("grok_polish_failed_reason: null"));
  assert.ok(grokFlow.includes("finalBrief = sanitizeFinalBriefUserFacingFields(mergePolishedFinalBrief(finalBrief, polishedFields));"));
  assert.ok(grokFlow.includes("final_brief: finalBrief"));
  assert.ok(grokFlow.includes("brief_id: savedBrief?.id || null"));
  assert.ok(grokFlow.includes('"brief_title"'));
  assert.ok(grokFlow.includes('"video_concept"'));
  assert.ok(grokFlow.includes('"hook"'));
  assert.ok(grokFlow.includes('"script_text"'));
  assert.ok(grokFlow.includes('"cta"'));
});

test("grokBriefiFlow locks improveFinalBrief as a Grok-only sanitized path with UGC POV protection", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes('if (action === "improveFinalBrief") {'));
  assert.ok(grokFlow.includes("body.selected_video_style ||"));
  assert.ok(grokFlow.includes("body.selectedVideoStyle ||"));
  assert.ok(grokFlow.includes("body.selectedStyle ||"));
  assert.ok(grokFlow.includes("body.style ||"));
  assert.ok(grokFlow.includes("body.user_facing_video_style ||"));
  assert.ok(grokFlow.includes("const policy = resolveStylePolicy(selectedVideoStyle);"));
  assert.ok(grokFlow.includes('const ugcPovInstruction = policy.ugcPovRequired ? buildUGCPovInstruction() : "";'));
  assert.ok(grokFlow.includes("You are Briefi Brief Improver. You receive an existing video brief and user feedback."));
  assert.ok(grokFlow.includes("${ugcPovInstruction ? `\\n${ugcPovInstruction}\\n` : \"\"}"));
  assert.ok(grokFlow.includes('Forbidden business POV phrases: "אנחנו", "אצלנו", "הכנו לכם", "בואו אלינו", "המוצר שלנו", "השירות שלנו", "הצוות שלנו", "לקוחות שלנו"'));
  assert.ok(grokFlow.includes("Preferred framing: \"ניסיתי את...\", \"לקחתי את...\", \"הגעתי ל...\", \"לא ציפיתי ש...\", \"אחרי יום עם זה...\", \"זה הרגיש לי...\", \"מה שאהבתי בזה...\", \"אם אתם מחפשים... שווה לבדוק\", \"לא פרסומת, פשוט חוויה שעבדה לי\"."));
  assert.ok(grokFlow.includes('const { parsed } = await callWithFallback(IMPROVE_SYSTEM, improveUser, 0.65);'));
  assert.ok(grokFlow.includes('return Response.json({ final_brief: sanitizeFinalBriefUserFacingFields(parsed), provider: "grok" });'));
  assert.ok(!grokFlow.includes('return Response.json({ final_brief: sanitizeFinalBriefUserFacingFields(parsed), provider: "openai" });'));
});

test("characterization guard confirms import and verify files are unchanged by this test-only contract", () => {
  const importer = read("base44/functions/importConceptBank/entry.ts");
  const verifier = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");

  assert.ok(importer.includes(`const UGC_V2_SOURCE_BATCH = "${UGC_V2_BATCH}"`));
  assert.ok(importer.includes(`const OLD_UGC_SOURCE_BATCH = "${OLD_UGC_BATCH}"`));
  assert.ok(verifier.includes(`const UGC_V2_SOURCE_BATCH = "${UGC_V2_BATCH}"`));
  assert.ok(verifier.includes(`const OLD_UGC_SOURCE_BATCH = "${OLD_UGC_BATCH}"`));
});
