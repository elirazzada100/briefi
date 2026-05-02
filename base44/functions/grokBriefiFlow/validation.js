import {
  AIFlowError,
  containsUnsafeOutput,
  hasHebrewText,
  scanObjectForUnsafeOutput,
} from "./guardrails.js";

const INDUSTRY_MAP_BY_ORDER = new Map([
  [1, "מסעדנות ואוכל"],
  [2, "יופי ואסתטיקה"],
  [3, "פיטנס ותזונה"],
  [4, "מאמנים, יועצים ונותני ידע"],
  [5, "עסקים מקומיים ושירותים לבית"],
  [6, "נדל״ן, עיצוב פנים ושיפוצים"],
  [7, "אירועים, לילה וחוויות"],
  [8, "אופנה, תכשיטים ובוטיקים"],
  [9, "הורות, ילדים ומשפחה"],
  [10, "בריאות, טיפול ו-Wellness"],
]);

function validationError(message, code = "VALIDATION_FAILED") {
  return new AIFlowError(422, message, {
    userMessage: "משהו נתקע בדרך. נסו שוב בעוד רגע.",
    code,
  });
}

function assert(condition, message, code) {
  if (!condition) {
    throw validationError(message, code);
  }
}

function sharesMeaningfulToken(left, right) {
  const leftTokens = String(left || "").split(/\s+/).filter((token) => token.length >= 3);
  const rightValue = String(right || "");
  return leftTokens.length === 0 || leftTokens.some((token) => rightValue.includes(token));
}

function assertSafeText(value, fieldName, { requireHebrew = false } = {}) {
  assert(!containsUnsafeOutput(value), `${fieldName} contains unsafe content`, "UNSAFE_OUTPUT");
  if (requireHebrew) {
    assert(hasHebrewText(value), `${fieldName} must contain Hebrew text`, "NON_HEBREW_OUTPUT");
  }
}

function assertNoUnsafeObject(value, code = "UNSAFE_OUTPUT") {
  assert(!scanObjectForUnsafeOutput(value), "Output contains unsafe content", code);
}

export function validateBusinessAnalysisOutput(result) {
  const requiredKeys = [
    "business_analysis_cards",
    "recommended_content_directions",
    "main_angle",
    "audience_truth",
    "what_is_interesting",
    "what_to_avoid",
  ];

  requiredKeys.forEach((key) => assert(result?.[key] !== undefined, `Missing business analysis field: ${key}`, "BUSINESS_ANALYSIS_MISSING_FIELD"));
  assert(Array.isArray(result.business_analysis_cards) && result.business_analysis_cards.length === 5, "business_analysis_cards must contain 5 cards", "BUSINESS_ANALYSIS_BAD_CARDS");
  assert(Array.isArray(result.recommended_content_directions) && result.recommended_content_directions.length >= 3, "recommended_content_directions must contain at least 3 items", "BUSINESS_ANALYSIS_BAD_DIRECTIONS");
  assertNoUnsafeObject(result, "BUSINESS_ANALYSIS_UNSAFE");
  result.business_analysis_cards.forEach((card, index) => {
    assert(card?.title && card?.summary, `business_analysis_cards[${index}] is incomplete`, "BUSINESS_ANALYSIS_CARD_INCOMPLETE");
    assertSafeText(card.title, `business_analysis_cards[${index}].title`, { requireHebrew: true });
    assertSafeText(card.summary, `business_analysis_cards[${index}].summary`, { requireHebrew: true });
  });
  ["main_angle", "audience_truth", "what_is_interesting", "what_to_avoid"].forEach((key) => {
    assertSafeText(result[key], key, { requireHebrew: true });
  });
  return result;
}

export function validateBusinessClassificationOutput(result) {
  const order = Number(result?.industry_order);
  const expectedName = INDUSTRY_MAP_BY_ORDER.get(order);
  assert(Number.isInteger(order) && order >= 1 && order <= 10, "industry_order must be an integer between 1 and 10", "CLASSIFICATION_BAD_ORDER");
  assert(expectedName === result?.industry_name || expectedName === result?.category_name_he, "industry_name does not match industry_order", "CLASSIFICATION_BAD_NAME");
  assertSafeText(result.reason || "reason", "classification.reason", { requireHebrew: false });
  assertNoUnsafeObject(result, "CLASSIFICATION_UNSAFE");
  return {
    ...result,
    industry_order: order,
    industry_name: expectedName,
    category_name_he: expectedName,
  };
}

export function validateConceptSelectionOutput(concepts, context) {
  const { candidatePool, candidateIds, selectedVideoStyle, industryOrder } = context;
  assert(Array.isArray(concepts) && concepts.length === 4, "Concept selection must return exactly 4 concepts", "CONCEPT_COUNT_INVALID");

  const poolById = new Map(candidatePool.map((candidate) => [candidate.id, candidate]));
  concepts.forEach((concept, index) => {
    assert(concept.source_type === "concept_bank", `concept[${index}] source_type must be concept_bank`, "CONCEPT_SOURCE_INVALID");
    assert(candidateIds.has(concept.concept_bank_id), `concept[${index}] concept_bank_id is outside candidate pool`, "CONCEPT_ID_OUTSIDE_POOL");
    const poolEntry = poolById.get(concept.concept_bank_id);
    assert(poolEntry, `concept[${index}] candidate not found`, "CONCEPT_ID_OUTSIDE_POOL");
    assert(poolEntry.industry_order === industryOrder, `concept[${index}] wrong industry_order`, "CONCEPT_INDUSTRY_MISMATCH");
    assert(poolEntry.user_facing_video_style === selectedVideoStyle, `concept[${index}] wrong video style`, "CONCEPT_STYLE_MISMATCH");
    assert(!/^\d+[\.\s]+/.test(concept.concept_title || ""), `concept[${index}] title contains leading source numbers`, "CONCEPT_TITLE_NUMBERED");
    assertSafeText(concept.concept_title, `concept[${index}].concept_title`, { requireHebrew: true });
    assertSafeText(concept.short_description, `concept[${index}].short_description`, { requireHebrew: true });
  });
  assertNoUnsafeObject(concepts, "CONCEPT_UNSAFE");
  return concepts;
}

export function validateTrendyConceptOutput(concepts) {
  assert(Array.isArray(concepts) && concepts.length === 4, "Trendy concepts must return exactly 4 concepts", "TRENDY_CONCEPT_COUNT_INVALID");
  concepts.forEach((concept, index) => {
    assertSafeText(concept.concept_title, `trendy concept[${index}].concept_title`, { requireHebrew: true });
    assertSafeText(concept.short_description, `trendy concept[${index}].short_description`, { requireHebrew: true });
  });
  assertNoUnsafeObject(concepts, "TRENDY_CONCEPT_UNSAFE");
  return concepts;
}

export function validateOpeningOptionsOutput(options) {
  assert(Array.isArray(options) && options.length === 4, "Opening options must return exactly 4 items", "OPENING_COUNT_INVALID");
  options.forEach((option, index) => {
    assert(option.source_type === "grok_generated", `opening[${index}] source_type must be grok_generated`, "OPENING_SOURCE_INVALID");
    assert(option.opening_line, `opening[${index}] opening_line is required`, "OPENING_LINE_MISSING");
    assert(!option.hook_id && !option.source_hook_template_id, `opening[${index}] contains forbidden hook metadata`, "OPENING_METADATA_INVALID");
    assertSafeText(option.opening_line, `opening[${index}].opening_line`, { requireHebrew: true });
    assertSafeText(option.why_it_fits || "", `opening[${index}].why_it_fits`, { requireHebrew: true });
  });
  assertNoUnsafeObject(options, "OPENING_UNSAFE");
  return options;
}

export function validateCTAOptionsOutput(options) {
  assert(Array.isArray(options) && options.length === 4, "CTA options must return exactly 4 items", "CTA_COUNT_INVALID");
  options.forEach((option, index) => {
    assert(option.cta_text, `cta[${index}] cta_text is required`, "CTA_TEXT_MISSING");
    assertSafeText(option.cta_text, `cta[${index}].cta_text`, { requireHebrew: true });
    assertSafeText(option.why_it_fits || "", `cta[${index}].why_it_fits`, { requireHebrew: true });
  });
  assertNoUnsafeObject(options, "CTA_UNSAFE");
  return options;
}

export function validateFinalBriefOutput(brief, context) {
  const selectedOpeningLine = context.selectedOpeningLine || "";
  const selectedCTA = context.selectedCTA || "";
  const selectedConceptTitle = context.selectedConceptTitle || "";
  const selectedVideoStyle = context.selectedVideoStyle || "";

  const requiredKeys = [
    "brief_title",
    "video_style_label",
    "video_concept",
    "hook",
    "what_happens_on_screen",
    "script_text",
    "shot_structure",
    "text_overlays",
    "cta",
    "caption_suggestion",
    "production_notes",
    "shooting_time_priority",
  ];

  requiredKeys.forEach((key) => assert(brief?.[key] !== undefined && brief?.[key] !== "", `Missing final brief field: ${key}`, "FINAL_BRIEF_FIELD_MISSING"));
  assert(Array.isArray(brief.shot_structure) && brief.shot_structure.length >= 1, "shot_structure is required", "FINAL_BRIEF_SHOTS_INVALID");
  assert(Array.isArray(brief.text_overlays) && brief.text_overlays.length >= 1, "text_overlays is required", "FINAL_BRIEF_OVERLAYS_INVALID");
  assert(brief.hook === selectedOpeningLine, "Selected opening line was not used verbatim", "FINAL_BRIEF_OPENING_MISMATCH");
  assert(brief.cta === selectedCTA, "Selected CTA was not used", "FINAL_BRIEF_CTA_MISMATCH");
  if (selectedVideoStyle) {
    assert(brief.video_style_label === selectedVideoStyle, "Selected video style was not used", "FINAL_BRIEF_STYLE_MISMATCH");
  }
  assert(
    selectedConceptTitle === "" ||
    sharesMeaningfulToken(selectedConceptTitle, brief.video_concept) ||
    sharesMeaningfulToken(selectedConceptTitle, brief.what_happens_on_screen),
    "Selected concept is not reflected in final brief",
    "FINAL_BRIEF_CONCEPT_MISMATCH"
  );
  assertSafeText(brief.brief_title, "final_brief.brief_title", { requireHebrew: true });
  assertSafeText(brief.video_style_label, "final_brief.video_style_label", { requireHebrew: true });
  assertSafeText(brief.video_concept, "final_brief.video_concept", { requireHebrew: true });
  assertSafeText(brief.what_happens_on_screen, "final_brief.what_happens_on_screen", { requireHebrew: true });
  assertSafeText(brief.script_text, "final_brief.script_text", { requireHebrew: true });
  assertSafeText(brief.caption_suggestion, "final_brief.caption_suggestion", { requireHebrew: true });
  assertSafeText(brief.production_notes, "final_brief.production_notes", { requireHebrew: true });
  assertSafeText(brief.shooting_time_priority, "final_brief.shooting_time_priority", { requireHebrew: true });
  assert(!/בריף/.test(brief.video_description || ""), "Final video should not call a single video a brief", "FINAL_BRIEF_TERMINOLOGY_INVALID");
  assert(!/קפישן/.test(brief.caption_suggestion || ""), "Final video must use תיאור הסרטון terminology", "FINAL_BRIEF_TERMINOLOGY_INVALID");
  assertNoUnsafeObject(brief, "FINAL_BRIEF_UNSAFE");
  return brief;
}

export function validateTrendSyncOutput(trends) {
  assert(Array.isArray(trends) && trends.length >= 1, "Trend sync must return at least one trend", "TREND_SYNC_EMPTY");
  trends.forEach((trend, index) => {
    ["trend_name", "platform", "structure", "how_to_adapt", "example_hebrew", "freshness_status"].forEach((field) => {
      assert(trend?.[field], `trend[${index}] missing ${field}`, "TREND_SYNC_FIELD_MISSING");
      assertSafeText(trend[field], `trend[${index}].${field}`, { requireHebrew: field !== "platform" && field !== "freshness_status" });
    });
  });
  assertNoUnsafeObject(trends, "TREND_SYNC_UNSAFE");
  return trends;
}
