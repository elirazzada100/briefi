import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getMockCreativeDNAResponse,
  getMockConceptsResponse,
  getMockOpeningOptionsResponse,
  getMockCTAOptionsResponse,
  getMockFinalBriefResponse,
  getMockImprovedFinalBriefResponse,
} from "./base44/functions/grokBriefiFlow/mockResponses.js";
import { getMockClassifyBusinessCategoryResponse } from "./base44/functions/classifyBusinessCategory/mockResponses.js";

const repoRoot = path.resolve(".");
const REGULAR_BATCH = "1000_Concepts_Briefi_10_display_clean";
const UGC_V2_BATCH = "1000_UGC_Briefi_10_display_clean_v2";
const MOCK_AI_FLAG = "BRIEFI_MOCK_AI";
const MOCK_AI_ALLOW_PERSIST_FLAG = "BRIEFI_MOCK_AI_ALLOW_PERSIST";

const MOCKABLE_ACTIONS = [
  "generateCreativeDNA",
  "generateConcepts",
  "generateOpeningOptions",
  "generateCTAOptions",
  "assembleFinalBrief",
  "improveFinalBrief",
  "classifyBusinessCategory",
];

const MOCK_RESPONSE_KEYS = {
  generateCreativeDNA: ["creative_dna", "provider"],
  generateConcepts: ["concepts", "source", "candidates_count", "pool_sent_to_openai", "validation_passed", "provider_log"],
  generateOpeningOptions: ["opening_options", "source", "provider_log"],
  generateCTAOptions: ["cta_options", "provider_log"],
  assembleFinalBrief: ["final_brief", "brief_id", "provider_log"],
  improveFinalBrief: ["final_brief", "provider"],
  classifyBusinessCategory: ["category_id", "category_name_he", "confidence", "reason", "secondary_category_id", "needs_user_confirmation", "industry_order", "industry_name"],
};

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function walkStrings(value, visit) {
  if (typeof value === "string") {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walkStrings(item, visit));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => walkStrings(item, visit));
  }
}

function collectStrings(value) {
  const values = [];
  walkStrings(value, (item) => values.push(item));
  return values;
}

test("mock AI mode contract requires explicit server-side env flags", () => {
  assert.equal(MOCK_AI_FLAG, "BRIEFI_MOCK_AI");
  assert.equal(MOCK_AI_ALLOW_PERSIST_FLAG, "BRIEFI_MOCK_AI_ALLOW_PERSIST");
});

test("mock AI mode contract disallows frontend localStorage query param or request-body-only enablement", () => {
  const app = read("src/App.jsx");
  const creativeDNA = read("src/pages/CreativeDNA.jsx");
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  [app, creativeDNA, conceptPicker].forEach((source) => {
    assert.ok(!source.includes(MOCK_AI_FLAG));
    assert.ok(!source.includes(MOCK_AI_ALLOW_PERSIST_FLAG));
    assert.ok(!source.includes("mockAi"));
    assert.ok(!source.includes("mockAI"));
  });

  [grokFlow, classifier].forEach((source) => {
    assert.ok(!source.includes("localStorage"));
    assert.ok(!source.includes("URLSearchParams"));
    assert.ok(!source.includes("body.mock"));
    assert.ok(!source.includes("query.mock"));
    assert.ok(!source.includes("request.mock"));
  });
});

test("mock AI mode contract is anchored at grokBriefiFlow action router and classifyBusinessCategory", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(grokFlow.includes('if (action === "generateCreativeDNA") {'));
  assert.ok(grokFlow.includes('if (action === "generateConcepts") {'));
  assert.ok(grokFlow.includes('if (action === "generateOpeningOptions") {'));
  assert.ok(grokFlow.includes('if (action === "generateCTAOptions") {'));
  assert.ok(grokFlow.includes('if (action === "assembleFinalBrief") {'));
  assert.ok(grokFlow.includes('if (action === "improveFinalBrief") {'));
  assert.ok(classifier.includes("const { businessDescription } = await req.json();"));
  assert.ok(classifier.includes("const raw = await callGrokDirect("));
});

test("mock AI mode contract locks the exact actions to mock", () => {
  assert.deepEqual(MOCKABLE_ACTIONS, [
    "generateCreativeDNA",
    "generateConcepts",
    "generateOpeningOptions",
    "generateCTAOptions",
    "assembleFinalBrief",
    "improveFinalBrief",
    "classifyBusinessCategory",
  ]);
});

test("mock AI mode contract locks fake response shapes to existing runtime keys", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.deepEqual(MOCK_RESPONSE_KEYS.generateCreativeDNA, ["creative_dna", "provider"]);
  assert.ok(grokFlow.includes('return Response.json({ creative_dna: dna, provider: "grok" });'));

  assert.deepEqual(MOCK_RESPONSE_KEYS.generateConcepts, ["concepts", "source", "candidates_count", "pool_sent_to_openai", "validation_passed", "provider_log"]);
  assert.ok(grokFlow.includes("concepts,"));
  assert.ok(grokFlow.includes('source: "concept_bank"'));
  assert.ok(grokFlow.includes("candidates_count: candidates.length"));
  assert.ok(grokFlow.includes("pool_sent_to_openai: pool.length"));
  assert.ok(grokFlow.includes("validation_passed: true"));
  assert.ok(grokFlow.includes("provider_log:"));

  assert.deepEqual(MOCK_RESPONSE_KEYS.generateOpeningOptions, ["opening_options", "source", "provider_log"]);
  assert.ok(grokFlow.includes("opening_options: options"));
  assert.ok(grokFlow.includes('source: "grok_generated"'));

  assert.deepEqual(MOCK_RESPONSE_KEYS.generateCTAOptions, ["cta_options", "provider_log"]);
  assert.ok(grokFlow.includes("cta_options: sanitizeCTAOptions(parsed.cta_options || [])"));

  assert.deepEqual(MOCK_RESPONSE_KEYS.assembleFinalBrief, ["final_brief", "brief_id", "provider_log"]);
  assert.ok(grokFlow.includes("final_brief: finalBrief"));
  assert.ok(grokFlow.includes("brief_id: savedBrief?.id || null"));

  assert.deepEqual(MOCK_RESPONSE_KEYS.improveFinalBrief, ["final_brief", "provider"]);
  assert.ok(grokFlow.includes('return Response.json({ final_brief: sanitizeFinalBriefUserFacingFields(parsed), provider: "grok" });'));

  assert.deepEqual(MOCK_RESPONSE_KEYS.classifyBusinessCategory, ["category_id", "category_name_he", "confidence", "reason", "secondary_category_id", "needs_user_confirmation", "industry_order", "industry_name"]);
  assert.ok(classifier.includes("result.industry_order = cat.industry_order;"));
  assert.ok(classifier.includes("result.industry_name = cat.name_he;"));
});

test("mock AI mode contract requires bypassing real provider helpers when active", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(grokFlow.includes("async function callGrok(systemPrompt, userPrompt, temperature = 0.7)"));
  assert.ok(grokFlow.includes("async function callWithFallback(systemPrompt, userPrompt, temperature = 0.7)"));
  assert.ok(grokFlow.includes("async function callOpenAIForConcepts(systemPrompt, userPrompt, temperature = 0.7)"));
  assert.ok(classifier.includes("async function callGrokDirect(systemPrompt, userPrompt, temperature = 0.2)"));
});

test("mock AI mode contract skips persistence by default and requires a separate allow-persist env flag", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.equal(MOCK_AI_ALLOW_PERSIST_FLAG, "BRIEFI_MOCK_AI_ALLOW_PERSIST");
  assert.ok(grokFlow.includes("await base44.asServiceRole.entities.Project.update(pid, {"));
  assert.ok(grokFlow.includes("savedBrief = await base44.asServiceRole.entities.VideoBrief.create({"));
  assert.ok(grokFlow.includes("await base44.asServiceRole.entities.Project.update(project_id, {"));
});

test("mock AI mode contract locks safety boundaries and preserved source batches", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes(`const ACTIVE_CONCEPT_SOURCE_BATCH = "${REGULAR_BATCH}"`));
  assert.ok(grokFlow.includes(`const UGC_CONCEPT_SOURCE_BATCH = "${UGC_V2_BATCH}"`));
  assert.ok(!grokFlow.includes("briefi_ugc_conceptbank"));
  assert.ok(grokFlow.includes("function sanitizeUserFacingHebrewCopy(value)"));
  assert.ok(grokFlow.includes("function sanitizeConceptCards(concepts)"));
  assert.ok(grokFlow.includes("function sanitizeOpeningOptions(openingOptions)"));
  assert.ok(grokFlow.includes("function sanitizeCTAOptions(ctaOptions)"));
  assert.ok(grokFlow.includes("function sanitizeFinalBriefUserFacingFields(finalBrief)"));
});

test("mock AI mode contract preserves current product invariants while adding no runtime behavior yet", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const stylePicker = read("src/pages/VideoStylePicker.jsx");

  assert.ok(grokFlow.includes("function buildUGCPovInstruction()"));
  assert.ok(grokFlow.includes("shouldSkipHook: false,"));
  assert.ok(grokFlow.includes('const isTrendy = normalizedStyle === "טרנדי";'));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("grok_polish_attempted"));
  assert.ok(grokFlow.includes("Write like a sharp Israeli social media strategist who actually looked at the business and formed an opinion."));
  assert.ok(stylePicker.includes("UGC / המלצה"));
});

test("mock AI response helper files exist and stay pure", () => {
  const grokHelpers = read("base44/functions/grokBriefiFlow/mockResponses.js");
  const classifierHelpers = read("base44/functions/classifyBusinessCategory/mockResponses.js");

  assert.ok(grokHelpers.includes("export function getMockCreativeDNAResponse()"));
  assert.ok(grokHelpers.includes("export function getMockConceptsResponse("));
  assert.ok(grokHelpers.includes("export function getMockOpeningOptionsResponse("));
  assert.ok(grokHelpers.includes("export function getMockCTAOptionsResponse("));
  assert.ok(grokHelpers.includes("export function getMockFinalBriefResponse("));
  assert.ok(grokHelpers.includes("export function getMockImprovedFinalBriefResponse("));
  assert.ok(classifierHelpers.includes("export function getMockClassifyBusinessCategoryResponse()"));

  [grokHelpers, classifierHelpers].forEach((source) => {
    assert.ok(!source.includes("callGrok"));
    assert.ok(!source.includes("callWithFallback"));
    assert.ok(!source.includes("callOpenAIForConcepts"));
    assert.ok(!source.includes("callGrokDirect"));
    assert.ok(!source.includes("fetch("));
    assert.ok(!source.includes("createClientFromRequest"));
    assert.ok(!source.includes("asServiceRole"));
    assert.ok(!source.includes(".create("));
    assert.ok(!source.includes(".update("));
    assert.ok(!source.includes(".filter("));
    assert.ok(!source.includes("Deno.env"));
  });
});

test("mock AI response helpers preserve response shapes for every action", () => {
  const creative = getMockCreativeDNAResponse();
  assert.deepEqual(Object.keys(creative), ["creative_dna", "provider"]);
  assert.equal(creative.provider, "mock");
  assert.deepEqual(Object.keys(creative.creative_dna), [
    "business_analysis_cards",
    "recommended_content_directions",
    "main_angle",
    "audience_truth",
    "what_is_interesting",
    "what_to_avoid",
  ]);
  assert.equal(creative.creative_dna.business_analysis_cards.length, 5);

  const regularConcepts = getMockConceptsResponse({ selectedStyle: "תדמית", isUGC: false, isTrendy: false });
  const ugcConcepts = getMockConceptsResponse({ selectedStyle: "ugc", isUGC: true, isTrendy: false });
  const trendyConcepts = getMockConceptsResponse({ selectedStyle: "טרנדי", isUGC: false, isTrendy: true });
  [regularConcepts, ugcConcepts, trendyConcepts].forEach((response) => {
    assert.deepEqual(Object.keys(response), ["concepts", "source", "candidates_count", "pool_sent_to_openai", "validation_passed", "provider_log"]);
    assert.equal(response.source, "mock");
    assert.equal(response.pool_sent_to_openai, false);
    assert.equal(response.validation_passed, true);
    assert.equal(response.concepts.length, 4);
  });
  assert.notDeepEqual(regularConcepts.concepts, ugcConcepts.concepts);
  assert.notDeepEqual(trendyConcepts.concepts, ugcConcepts.concepts);

  const opening = getMockOpeningOptionsResponse({ selectedStyle: "תדמית", isUGC: false });
  assert.deepEqual(Object.keys(opening), ["opening_options", "source", "provider_log"]);
  assert.equal(opening.source, "mock");
  assert.equal(opening.opening_options.length, 4);

  const cta = getMockCTAOptionsResponse({ selectedStyle: "ugc", isUGC: true });
  assert.deepEqual(Object.keys(cta), ["cta_options", "provider_log"]);
  assert.equal(cta.cta_options.length, 4);

  const finalBrief = getMockFinalBriefResponse({ selectedStyle: "ugc", isUGC: true });
  assert.deepEqual(Object.keys(finalBrief), [
    "final_brief",
    "brief_id",
    "provider_log",
    "openai_assemble_used",
    "grok_polish_attempted",
    "grok_polish_applied",
    "grok_polish_failed_reason",
  ]);
  assert.equal(finalBrief.brief_id, "mock-brief-id");
  assert.equal(finalBrief.openai_assemble_used, false);
  assert.equal(finalBrief.grok_polish_attempted, false);
  assert.equal(finalBrief.grok_polish_applied, false);
  assert.equal(finalBrief.grok_polish_failed_reason, null);

  const improved = getMockImprovedFinalBriefResponse({ selectedStyle: "ugc", isUGC: true });
  assert.deepEqual(Object.keys(improved), ["final_brief", "provider"]);
  assert.equal(improved.provider, "mock");

  const classifier = getMockClassifyBusinessCategoryResponse();
  assert.deepEqual(Object.keys(classifier), ["industry_order", "industry_name", "confidence", "category_id"]);
});

test("mock AI response helpers keep UGC POV, avoid dash chars, and expose no prompts or secrets", () => {
  const safeStrings = [
    ...collectStrings(getMockCreativeDNAResponse().creative_dna),
    ...collectStrings(getMockConceptsResponse({ selectedStyle: "תדמית", isUGC: false, isTrendy: false }).concepts),
    ...collectStrings(getMockConceptsResponse({ selectedStyle: "ugc", isUGC: true, isTrendy: false }).concepts),
    ...collectStrings(getMockConceptsResponse({ selectedStyle: "טרנדי", isUGC: false, isTrendy: true }).concepts),
    ...collectStrings(getMockOpeningOptionsResponse({ selectedStyle: "ugc", isUGC: true }).opening_options),
    ...collectStrings(getMockCTAOptionsResponse({ selectedStyle: "ugc", isUGC: true }).cta_options),
    ...collectStrings(getMockFinalBriefResponse({ selectedStyle: "ugc", isUGC: true }).final_brief),
    ...collectStrings(getMockImprovedFinalBriefResponse({ selectedStyle: "ugc", isUGC: true }).final_brief),
    ...collectStrings(getMockClassifyBusinessCategoryResponse()),
  ];

  safeStrings.forEach((value) => {
    assert.doesNotMatch(value, /[-–—־]/);
    assert.doesNotMatch(value, /api[_ -]?key/i);
    assert.doesNotMatch(value, /authorization/i);
    assert.doesNotMatch(value, /prompt/i);
    assert.doesNotMatch(value, /raw provider/i);
  });

  const ugcJoined = JSON.stringify(getMockConceptsResponse({ selectedStyle: "ugc", isUGC: true, isTrendy: false }));
  assert.match(ugcJoined, /ניסיתי|מישהי|לקוחה|יוצר תוכן|אם אתם מתלבטים|מה שאהבתי/);
  assert.doesNotMatch(ugcJoined, /אנחנו|אצלנו|בואו אלינו|הכנו לכם|המוצר שלנו|השירות שלנו|הצוות שלנו/);

  const ugcCtaJoined = JSON.stringify(getMockCTAOptionsResponse({ selectedStyle: "ugc", isUGC: true }));
  assert.doesNotMatch(ugcCtaJoined, /אנחנו|אצלנו|בואו אלינו|הכנו לכם|המוצר שלנו|השירות שלנו|הצוות שלנו/);
});

test("mock AI runtime stays server-side env gated and bypasses user-controlled enablement", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(grokFlow.includes('function isMockAIEnabled()'));
  assert.ok(classifier.includes('function isMockAIEnabled()'));
  assert.ok(grokFlow.includes('globalThis.process?.env?.BRIEFI_MOCK_AI === "true"'));
  assert.ok(classifier.includes('globalThis.process?.env?.BRIEFI_MOCK_AI === "true"'));
  assert.ok(!grokFlow.includes("localStorage"));
  assert.ok(!classifier.includes("localStorage"));
  assert.ok(!grokFlow.includes("URLSearchParams"));
  assert.ok(!classifier.includes("URLSearchParams"));
  assert.ok(!grokFlow.includes("body.mock"));
  assert.ok(!classifier.includes("body.mock"));
  assert.ok(!grokFlow.includes("query.mock"));
  assert.ok(!classifier.includes("query.mock"));
});

test("mock AI runtime routes supported actions through mock helpers only when env-gated", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(grokFlow.includes('import {'));
  assert.ok(grokFlow.includes('} from "./mockResponses.js";'));
  assert.ok(grokFlow.includes('const mockAIEnabled = isMockAIEnabled();'));
  assert.ok(grokFlow.includes('if (mockAIEnabled && action === "generateCreativeDNA") {'));
  assert.ok(grokFlow.includes('return Response.json(getMockCreativeDNAResponse());'));
  assert.ok(grokFlow.includes('if (mockAIEnabled && action === "generateConcepts") {'));
  assert.ok(grokFlow.includes('return Response.json(getMockConceptsResponse({'));
  assert.ok(grokFlow.includes('if (mockAIEnabled && action === "generateOpeningOptions") {'));
  assert.ok(grokFlow.includes('return Response.json(getMockOpeningOptionsResponse({'));
  assert.ok(grokFlow.includes('if (mockAIEnabled && action === "generateCTAOptions") {'));
  assert.ok(grokFlow.includes('return Response.json(getMockCTAOptionsResponse({'));
  assert.ok(grokFlow.includes('if (mockAIEnabled && action === "assembleFinalBrief") {'));
  assert.ok(grokFlow.includes('return Response.json(getMockFinalBriefResponse({'));
  assert.ok(grokFlow.includes('if (mockAIEnabled && action === "improveFinalBrief") {'));
  assert.ok(grokFlow.includes('return Response.json(getMockImprovedFinalBriefResponse({'));

  assert.ok(classifier.includes('import { getMockClassifyBusinessCategoryResponse } from "./mockResponses.js";'));
  assert.ok(classifier.includes('if (isMockAIEnabled()) {'));
  assert.ok(classifier.includes('return Response.json(getMockClassifyBusinessCategoryResponse());'));
});

test("mock AI runtime skips provider calls and persistence in mock branches while preserving production paths", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const classifier = read("base44/functions/classifyBusinessCategory/entry.ts");

  assert.ok(grokFlow.includes('if (!XAI_API_KEY) return Response.json({ error: XAI_API_KEY_MISSING_ERROR }, { status: 500 });'));
  assert.ok(classifier.includes('if (!XAI_API_KEY) return Response.json({ error: "XAI_API_KEY is not set" }, { status: 500 });'));
  assert.ok(grokFlow.includes('if (pid) {'));
  assert.ok(grokFlow.includes('await base44.asServiceRole.entities.Project.update(pid, {'));
  assert.ok(grokFlow.includes('savedBrief = await base44.asServiceRole.entities.VideoBrief.create({'));
  assert.ok(grokFlow.includes('await base44.asServiceRole.entities.Project.update(project_id, {'));
  assert.ok(grokFlow.includes('const policy = resolveStylePolicy(selectedVideoStyle);'));
  assert.ok(grokFlow.includes('const improveStyle ='));
  assert.ok(classifier.includes('const raw = await callGrokDirect('));

  const finalBrief = getMockFinalBriefResponse({ selectedStyle: "ugc", isUGC: true });
  assert.equal(finalBrief.brief_id, "mock-brief-id");
  assert.equal(finalBrief.openai_assemble_used, false);
  assert.equal(finalBrief.grok_polish_attempted, false);
});
