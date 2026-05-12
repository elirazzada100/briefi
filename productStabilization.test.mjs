import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function read(filePath) {
  return fs.readFileSync(new URL(filePath, import.meta.url), "utf8");
}

test("pdf export uses saved brief list for both export types and does not call AI", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(pdfExport, /const clientBriefs = briefs\.map\(/);
  assert.match(pdfExport, /const briefsHTML = briefs\.map\(/);
  assert.doesNotMatch(pdfExport, /briefiAI/);
  assert.doesNotMatch(pdfExport, /generateClientBriefSummary/);
  assert.doesNotMatch(pdfExport, /functions\.invoke\("briefiAI"/);
});

test("pdf wording uses short video labels instead of brief count wording", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(pdfExport, /formatShortVideosLabel/);
  assert.doesNotMatch(pdfExport, /בריפים מוכנים/);
});

test("pdf loading copy is package specific", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(pdfExport, /מסדרים את הבריף/);
  assert.match(pdfExport, /אורזים את הסרטונים/);
  assert.doesNotMatch(pdfExport, /מכינים את הסרטון/);
});

test("loading components use centered narrow text", () => {
  const sharedLoader = read("./src/components/shared/BriefiLoader.jsx");
  const sharedLoading = read("./src/components/shared/LoadingState.jsx");
  const briefiLoading = read("./src/components/briefi/LoadingState.jsx");

  [sharedLoader, sharedLoading, briefiLoading].forEach((source) => {
    assert.match(source, /text-center/);
    assert.match(source, /max-w-\[260px\]/);
  });
});

test("published flow safety boundaries remain intact", () => {
  const app = read("./src/App.jsx");
  const dashboard = read("./src/pages/Dashboard.jsx");
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");
  const stylePicker = read("./src/pages/VideoStylePicker.jsx");

  assert.match(app, /project\/:projectId\/special-focus/);
  assert.match(app, /project\/:projectId\/grok-concepts/);
  assert.match(app, /project\/:projectId\/grok-opening/);
  assert.match(app, /project\/:projectId\/grok-cta/);
  assert.doesNotMatch(app, /ClientDetail/);
  assert.match(dashboard, /Project\.filter/);
  assert.match(grokFlow, /1000_Concepts_Briefi_10_display_clean/);
  assert.match(grokFlow, /1000_UGC_Briefi_10_display_clean_v2/);
  assert.doesNotMatch(grokFlow, /1000_UGC_Briefi_10_display_clean"/);
  assert.doesNotMatch(grokFlow, /briefi_ugc_conceptbank/);
  assert.match(stylePicker, /UGC \/ המלצה/);
});

test("UGC runtime uses only the v2 batch while regular styles stay on the regular batch", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");

  assert.match(grokFlow, /const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean"/);
  assert.match(grokFlow, /const UGC_CONCEPT_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean_v2"/);
  assert.match(grokFlow, /const UGC_STYLE = "ugc"/);
  assert.match(grokFlow, /function resolveStylePolicy\(selectedStyle\)/);
  assert.match(grokFlow, /const conceptSourceBatch = policy\.sourceBatch/);
  assert.match(grokFlow, /const conceptStyle = policy\.conceptStyle/);
  assert.match(grokFlow, /source_batch: conceptSourceBatch/);
  assert.match(grokFlow, /user_facing_video_style: conceptStyle/);
  assert.match(grokFlow, /candidateIdSet/);
  assert.match(grokFlow, /wrong video style/);
  assert.doesNotMatch(grokFlow, /1000_UGC_Briefi_10_display_clean"/);
});

test("UGC copy uses external customer POV while regular and trendy prompts stay structurally unchanged", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");
  const stylePicker = read("./src/pages/VideoStylePicker.jsx");

  assert.match(stylePicker, /רק לא לשכוח קוד קופון!/);
  assert.doesNotMatch(stylePicker, /סרטון שנראה כמו המלצה אמיתית, עדות אישית או חוויה טבעית עם המוצר/);
  assert.match(grokFlow, /function buildUGCPovInstruction\(\)/);
  assert.match(grokFlow, /customer, user, creator, or someone outside the business who tried it/);
  assert.match(grokFlow, /Forbidden business POV phrases: "אנחנו", "אצלנו", "הכנו לכם", "בואו אלינו", "המוצר שלנו", "השירות שלנו", "הצוות שלנו", "לקוחות שלנו"/);
  assert.match(grokFlow, /Preferred framing: "ניסיתי את\.\.\.", "לקחתי את\.\.\.", "הגעתי ל\.\.\.", "לא ציפיתי ש\.\.\.", "אחרי יום עם זה\.\.\.", "זה הרגיש לי\.\.\.", "מה שאהבתי בזה\.\.\.", "אם אתם מחפשים\.\.\. שווה לבדוק", "לא פרסומת, פשוט חוויה שעבדה לי"\./);
  assert.match(grokFlow, /ugcPovRequired: isUGC,/);
  assert.match(grokFlow, /const ugcPovInstruction = policy\.ugcPovRequired \? buildUGCPovInstruction\(\) : "";/);
  assert.match(grokFlow, /const isUGC = normalizedStyle === UGC_STYLE;/);
});

test("UGC POV instruction is applied to hook CTA and final brief generation only when style is ugc", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");
  const ugcPromptInjectionCount = (grokFlow.match(/\$\{ugcPovInstruction\}/g) || []).length;

  assert.match(grokFlow, /Generate exactly 4 opening lines for this specific concept and business\./);
  assert.match(grokFlow, /Generate 4 CTA options that are natural, specific to this video, and feel Israeli\./);
  assert.match(grokFlow, /Assemble the brief now\. hook = opening line verbatim\./);
  assert.match(grokFlow, /Polish only these fields and return the same JSON keys:/);
  assert.match(grokFlow, /const ugcPovInstruction = policy\.ugcPovRequired \? buildUGCPovInstruction\(\) : "";/);
  assert.match(grokFlow, /const policy = resolveStylePolicy\(selectedVideoStyle\);/);
  assert.match(grokFlow, /Generate exactly 4 opening lines[\s\S]*?\$\{ugcPovInstruction\}/);
  assert.match(grokFlow, /Generate 4 CTA options[\s\S]*?\$\{ugcPovInstruction\}/);
  assert.match(grokFlow, /Assemble the brief now\. hook = opening line verbatim\.[\s\S]*?\$\{ugcPovInstruction\}/);
  assert.ok(ugcPromptInjectionCount >= 5, `Expected at least 5 UGC POV prompt injections, got ${ugcPromptInjectionCount}`);
});

test("hybrid final brief preserves exported field structure while adding provider polish metadata", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(grokFlow, /"brief_title"/);
  assert.match(grokFlow, /"video_concept"/);
  assert.match(grokFlow, /"hook"/);
  assert.match(grokFlow, /"script_format"/);
  assert.match(grokFlow, /"script_text"/);
  assert.match(grokFlow, /"shot_structure"/);
  assert.match(grokFlow, /"text_overlays"/);
  assert.match(grokFlow, /"cta"/);
  assert.match(grokFlow, /"video_description"/);
  assert.match(grokFlow, /"caption_suggestion"/);
  assert.match(grokFlow, /"visual_must_haves"/);
  assert.match(grokFlow, /"production_notes"/);
  assert.match(grokFlow, /"why_it_works"/);
  assert.match(grokFlow, /openai_assemble_used: true/);
  assert.match(grokFlow, /grok_polish_attempted/);
  assert.match(grokFlow, /grok_polish_applied/);
  assert.match(grokFlow, /grok_polish_failed_reason/);

  assert.match(pdfExport, /adapted_brief \|\| brief\.final_brief/);
  assert.match(pdfExport, /caption_suggestion \|\| fb\.video_description/);
});

test("openai-facing Hebrew copy prompts instruct the model to avoid dash punctuation", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");

  assert.match(grokFlow, /Avoid using dash punctuation in Hebrew output\./);
  assert.match(grokFlow, /Do not use "-", "–", or "—" as a stylistic separator\./);
  assert.match(grokFlow, /Prefer normal Hebrew punctuation: comma, period, colon, question mark, or a new sentence\./);
  assert.match(grokFlow, /Do not make the copy feel like an AI-generated marketing template\./);
  assert.match(grokFlow, /אין להשתמש במקפים בכלל בטקסט שמוצג למשתמש/);
});

test("business analysis prompt uses human Israeli strategist tone and forbids generic AI-corporate phrasing", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");

  assert.match(grokFlow, /Write like a sharp Israeli social media strategist who actually looked at the business and formed an opinion\./);
  assert.match(grokFlow, /The tone must feel human, direct, practical, slightly opinionated, and useful for a social media manager\./);
  assert.match(grokFlow, /Keep the main analysis paragraph short and confident: 2-3 sentences max\./);
  assert.match(grokFlow, /Keep the framing positive and strategic, but practical\./);
  assert.match(grokFlow, /Avoid these AI\/corporate phrases entirely:/);
  assert.match(grokFlow, /"קהל יעד"/);
  assert.match(grokFlow, /"ערך מוסף"/);
  assert.match(grokFlow, /"באמצעות"/);
  assert.match(grokFlow, /"שפה ויזואלית"/);
  assert.match(grokFlow, /"מבודל מהמתחרים"/);
  assert.match(grokFlow, /Analyze this business\. Fill all 5 cards with specific, actionable insights\. Provide 3-4 recommended_content_directions\./);
  assert.match(grokFlow, /"business_analysis_cards"/);
  assert.match(grokFlow, /"recommended_content_directions"/);
  assert.match(grokFlow, /"main_angle"/);
  assert.match(grokFlow, /generateBusinessAnalysisWithOpenAI/);
});

test("generateCreativeDNA keeps provider model and response contract while exposing safe timing debug only", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");
  const creativeDNA = read("./src/pages/CreativeDNA.jsx");

  assert.match(grokFlow, /const XAI_MODEL = Deno\.env\.get\("XAI_MODEL"\) \|\| "grok-3"/);
  assert.match(grokFlow, /const GROK_CREATIVE_DNA_TIMEOUT_MS = 11000/);
  assert.match(grokFlow, /callWithFallbackWithMetrics\(DNA_SYSTEM, dnaUser, 0\.7\)/);
  assert.match(grokFlow, /generateBusinessAnalysisWithOpenAI\(DNA_SYSTEM, dnaUser\)/);
  assert.match(grokFlow, /sanitizeCreativeDNA/);
  assert.match(grokFlow, /creative_dna: dna/);
  assert.match(grokFlow, /provider,/);
  assert.match(grokFlow, /generate_creative_dna_total_ms/);
  assert.match(grokFlow, /provider_roundtrip_ms/);
  assert.match(grokFlow, /parse_ms/);
  assert.match(grokFlow, /attempt_count/);
  assert.match(grokFlow, /retry_used/);
  assert.match(grokFlow, /project_update_ms/);
  assert.match(grokFlow, /timed_out/);
  assert.match(grokFlow, /fallback_used/);
  assert.match(grokFlow, /fallback_provider/);
  assert.match(grokFlow, /fallback_model/);
  assert.match(grokFlow, /grok_timeout_ms: GROK_CREATIVE_DNA_TIMEOUT_MS/);
  assert.doesNotMatch(grokFlow, /_debug:\s*\{[^}]*systemPrompt/);
  assert.doesNotMatch(grokFlow, /_debug:\s*\{[^}]*userPrompt/);
  assert.doesNotMatch(grokFlow, /_debug:\s*\{[^}]*OPENAI_API_KEY/);
  assert.doesNotMatch(grokFlow, /_debug:\s*\{[^}]*XAI_API_KEY/);
  assert.match(creativeDNA, /frontend_generate_dna_ms/);
  assert.match(creativeDNA, /frontend_request_started_at/);
  assert.match(creativeDNA, /frontend_request_finished_at/);
  assert.match(creativeDNA, /window\.localStorage\?\.getItem\("briefiDebugTiming"\) === "true"/);
});

test("CreativeDNA timeout fallback is limited to business analysis and leaves hook CTA and final brief provider paths unchanged", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");

  assert.match(grokFlow, /if \(action === "generateCreativeDNA"\) \{/);
  assert.match(grokFlow, /generateBusinessAnalysisWithOpenAI/);
  assert.doesNotMatch(grokFlow, /generateOpeningOptions[\s\S]*generateBusinessAnalysisWithOpenAI/);
  assert.doesNotMatch(grokFlow, /generateCTAOptions[\s\S]*generateBusinessAnalysisWithOpenAI/);
  assert.doesNotMatch(grokFlow, /assembleFinalBrief[\s\S]*generateBusinessAnalysisWithOpenAI/);
  assert.match(grokFlow, /await callWithFallback\(OPENING_GEN_GROK_SYSTEM, userPrompt, 0\.85\)/);
  assert.match(grokFlow, /await callWithFallback\(CTA_GEN_SYSTEM, userPrompt, 0\.7\)/);
  assert.match(grokFlow, /const polishTimeoutMs = 12000/);
  assert.match(grokFlow, /function sanitizeCreativeDNA\(creativeDna\)/);
});

test("stepper polish keeps only concept hook and CTA, and final brief does not render it", () => {
  const stepper = read("./src/components/briefi/BriefiStepper.jsx");
  const finalBrief = read("./src/pages/FinalBrief.jsx");

  assert.match(stepper, /const STEPS = \["פוקוס", "קונספט", "הוק", "CTA"\]/);
  assert.doesNotMatch(stepper, /פתיחה/);
  assert.doesNotMatch(stepper, /סרטון/);
  assert.doesNotMatch(stepper, /בריף/);
  assert.doesNotMatch(finalBrief, /BriefiStepper/);
});

test("deterministic dash sanitizer exists and applies only to user-facing copy fields", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");

  assert.match(grokFlow, /function sanitizeUserFacingHebrewCopy\(value\)/);
  assert.match(grokFlow, /replace\(\/\\s\*\[-–—־\]\+\\s\*\/g, "\. "\)/);
  assert.match(grokFlow, /function sanitizeConceptCards\(concepts\)/);
  assert.match(grokFlow, /function sanitizeOpeningOptions\(openingOptions\)/);
  assert.match(grokFlow, /function sanitizeCTAOptions\(ctaOptions\)/);
  assert.match(grokFlow, /function sanitizeFinalBriefUserFacingFields\(finalBrief\)/);
  assert.match(grokFlow, /script_format: finalBrief\?\.script_format \|\| ""/);
  assert.match(grokFlow, /cta_options: sanitizeCTAOptions\(parsed\.cta_options \|\| \[\]\)/);
});

test("dash sanitizer replaces user-facing Hebrew dashes with natural punctuation", () => {
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");
  const match = grokFlow.match(/function sanitizeUserFacingHebrewCopy\(value\) \{[\s\S]*?\n\}/);

  assert.ok(match, "sanitizeUserFacingHebrewCopy function not found");

  const sanitize = vm.runInNewContext(`(${match[0]})`);
  const input = "הסבר קצר על בחירת החומרים והתכנון המדויק - איכות, עמידות, נוחות וסטייל.";
  const output = sanitize(input);

  assert.equal(
    output,
    "הסבר קצר על בחירת החומרים והתכנון המדויק. איכות, עמידות, נוחות וסטייל."
  );
  assert.doesNotMatch(output, /[-–—־]/);
});
