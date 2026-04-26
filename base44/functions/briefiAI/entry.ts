import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

const FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || "gpt-4o-mini";
const STRATEGY_MODEL = Deno.env.get("OPENAI_STRATEGY_MODEL") || "gpt-4o";

const SYSTEM_PROMPT = `You are Briefi, an Israeli social media brief-building assistant.

Your job is to help social media managers create sharp, practical, client-ready short-form video briefs for Israeli businesses.

You do not write generic marketing content.
You do not write like an American guru.
You do not write like an agency presentation.
You do not create a full brief immediately.
You guide the user step by step.

Core product flow:
1. Analyze the business
2. Create Creative DNA
3. Generate 4 video concepts
4. Generate 4 hooks based on the selected concept
5. Generate 4 script/body options
6. Generate 4 CTA options
7. Assemble a final brief
8. Check and improve quality if needed

Core writing principles:
- Start from a real situation, not a generic topic.
- A situation is something the viewer recognizes from real life — not a marketing statement.
- WEAK: "שיווק לעסק" | STRONG: "בעל עסק שהעלה ריל וקיבל 214 צפיות ולא מבין למה"
- WEAK: "אוכל טעים באווירה טובה" | STRONG: "החבר שאמר רק ביס ואז גמר לכם חצי מנה"
- Write in practical Israeli Hebrew. Clear over clever. Specific over pretty.
- Shootable over conceptual. Spoken rhythm over polished copy.
- Client-safe, but not dead.
- One idea per Reel.
- The hook must create a small laugh, small discomfort, or "wait, that's me".
- Every final brief must include actual script_text.
- script_text is what the person says, the voiceover says, or the text-led video communicates.
- A final brief without script_text is incomplete.
- If the copy could fit any business, it is too generic.
- If it sounds like a marketing blog, rewrite it.
- If it sounds like a translated American Twitter thread, rewrite it.
- If it cannot be said out loud naturally in Hebrew, rewrite it.
- If it cannot be filmed tomorrow with a phone, rewrite it.
- Use Content Intelligence rows (VoiceRules, HookPatterns, ScriptPatterns, etc.) as style and structure guidance only.
- Do not copy examples directly. Generate original content for the user's specific business, goal, concept, and category.

When generating 4 options, make them meaningfully different:
1. Safe/client-friendly
2. Social/native
3. More human/funny
4. Sharper/riskier

Return valid JSON only. No markdown, no code blocks, no explanations.`;

function estimateCost(inputTokens, outputTokens, model) {
  const pricing = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
  };
  const key = Object.keys(pricing).find(k => model.includes(k.replace("gpt-4o-mini", "4o-mini").replace("gpt-4o", "4o"))) || "gpt-4o-mini";
  const p = pricing[key] || pricing["gpt-4o-mini"];
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
}

async function callOpenAI(openai, model, userPrompt) {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    max_completion_tokens: 3000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });
  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);
  const usage = response.usage || {};
  return { parsed, inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0 };
}

async function saveGeneration(base44, userId, projectId, actionType, model, inputPayload, outputPayload, inputTokens, outputTokens, success, errorMessage) {
  const cost = estimateCost(inputTokens, outputTokens, model);
  const gen = await base44.asServiceRole.entities.Generation.create({
    user_id: userId,
    project_id: projectId,
    action_type: actionType,
    model,
    input_payload: inputPayload,
    output_payload: outputPayload,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: cost,
    success,
    error_message: errorMessage || null
  });
  await base44.asServiceRole.entities.ApiUsage.create({
    user_id: userId,
    project_id: projectId,
    generation_id: gen.id,
    action_type: actionType,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: cost
  });
  return gen;
}

// Smart relevance scoring: category match > global > none
function matchesCategory(row, category, field = "category_fit") {
  const fit = row[field];
  if (!fit || !fit.length) return "global";
  if (fit.includes(category)) return "category";
  if (fit.includes("global")) return "global";
  return null;
}

const FOOD_INDUSTRIES = ["food", "bars", "cafes", "street_food", "restaurants", "local_food", "nightlife_food"];
const BEAUTY_INDUSTRIES = ["beauty", "aesthetics", "nails", "brows", "lashes", "hair", "skincare", "makeup", "clinic", "aesthetic_clinic"];
const FITNESS_INDUSTRIES = ["fitness", "nutrition", "personal_training", "gym", "pilates", "yoga", "sports_therapy", "weight_loss", "strength_training", "fitness_studio"];
const MARKETING_INDUSTRIES = ["marketing", "social_media", "content_creator", "agency", "creative_services", "copywriting", "video_editor", "photographer", "branding", "design", "paid_media", "ai_creator"];
const COACHING_INDUSTRIES = ["coach", "consultant", "business_coach", "mentor", "career_coach", "sales_consultant", "financial_coach", "leadership"];
const LOCAL_SERVICE_INDUSTRIES = ["local_service", "technician", "plumber", "electrician", "locksmith", "cleaning", "moving", "handyman", "car_service", "repair", "professional_service"];
const REAL_ESTATE_INDUSTRIES = ["real_estate", "interior_design", "renovation", "architecture", "contractor", "home_design", "property", "home_staging", "construction", "kitchen_design"];
const EVENTS_INDUSTRIES = ["events", "weddings", "nightlife", "dj", "event_venue", "party", "event_planner", "catering_events", "photographer_events", "bar_events"];

function buildIntelligenceContext({
  voiceRules, hookPatterns, captionPatterns, ctaPatterns, scriptPatterns, trendPatterns,
  voiceSamples, briefExamples, goodExamples, badExamples,
  category, industry, mainGoal
}) {
  let ctx = "";

  // VOICE RULES: always load global high-priority + category-specific
  const highPriorityGlobal = (voiceRules || []).filter(r =>
    r.is_active && r.category === "global" && r.priority === "high"
  );
  const catRules = (voiceRules || []).filter(r =>
    r.is_active && r.category === category
  );
  const mediumGlobal = (voiceRules || []).filter(r =>
    r.is_active && r.category === "global" && r.priority !== "high"
  ).slice(0, 3);
  const allRules = [...highPriorityGlobal, ...catRules, ...mediumGlobal];
  if (allRules.length) {
    ctx += "\n\n--- VOICE RULES (follow strictly) ---\n";
    allRules.forEach(r => {
      ctx += `[${r.rule_type.toUpperCase()}] ${r.rule_text}\n`;
      if (r.example_good) ctx += `  ✓ "${r.example_good}"\n`;
      if (r.example_bad) ctx += `  ✗ Avoid: "${r.example_bad}"\n`;
    });
  }

  // HOOK PATTERNS: industry+category match first, then category-only, then global fallback (max 6)
  const isFoodIndustry = FOOD_INDUSTRIES.includes(industry);
  const isBeautyIndustry = BEAUTY_INDUSTRIES.includes(industry);
  const isFitnessIndustry = FITNESS_INDUSTRIES.includes(industry);
  const isMarketingIndustry = MARKETING_INDUSTRIES.includes(industry);
  const isCoachingIndustry = COACHING_INDUSTRIES.includes(industry);
  const isLocalServiceIndustry = LOCAL_SERVICE_INDUSTRIES.includes(industry);
  const isRealEstateIndustry = REAL_ESTATE_INDUSTRIES.includes(industry);
  const isEventsIndustry = EVENTS_INDUSTRIES.includes(industry);
  const isSpecializedIndustry = isFoodIndustry || isBeautyIndustry || isFitnessIndustry || isMarketingIndustry || isCoachingIndustry || isLocalServiceIndustry || isRealEstateIndustry || isEventsIndustry;

  const ALL_INDUSTRY_LISTS = [...FOOD_INDUSTRIES, ...BEAUTY_INDUSTRIES, ...FITNESS_INDUSTRIES, ...MARKETING_INDUSTRIES, ...COACHING_INDUSTRIES, ...LOCAL_SERVICE_INDUSTRIES, ...REAL_ESTATE_INDUSTRIES, ...EVENTS_INDUSTRIES];

  const industryAndCategoryHooks = (hookPatterns || []).filter(p =>
    p.is_active && p.category_fit?.includes(category) &&
    p.industry_fit?.some(i => ALL_INDUSTRY_LISTS.includes(i) && (p.industry_fit.includes(industry) || ALL_INDUSTRY_LISTS.includes(i)))
  );
  const categoryHooks = (hookPatterns || []).filter(p =>
    p.is_active && p.category_fit?.includes(category) && !industryAndCategoryHooks.includes(p)
  );
  const industryHooks = (hookPatterns || []).filter(p =>
    p.is_active && p.industry_fit?.includes(industry) && !industryAndCategoryHooks.includes(p)
  );
  const globalHooks = (hookPatterns || []).filter(p =>
    p.is_active && (!p.category_fit?.length || p.category_fit.includes("general"))
    && !industryAndCategoryHooks.includes(p) && !categoryHooks.includes(p) && !industryHooks.includes(p)
  );
  const allHooks = isSpecializedIndustry
    ? [...industryAndCategoryHooks, ...industryHooks, ...categoryHooks].slice(0, 6)
    : [...categoryHooks, ...globalHooks].slice(0, 5);
  if (allHooks.length) {
    ctx += "\n\n--- HOOK PATTERNS (use for structure, not copy) ---\n";
    allHooks.forEach(p => {
      ctx += `• ${p.pattern_name}: "${p.template}"\n  e.g. "${p.example_hebrew}"\n`;
      if (p.risk_notes) ctx += `  ⚠ ${p.risk_notes}\n`;
    });
  }

  // SCRIPT PATTERNS: category+industry match first, then category, then global (max 3)
  const matchedScripts = (scriptPatterns || []).filter(p => p.is_active).sort((a, b) => {
    const aScore = (a.category_fit?.includes(category) ? 2 : 0) + (a.industry_fit?.includes(industry) ? 1 : 0);
    const bScore = (b.category_fit?.includes(category) ? 2 : 0) + (b.industry_fit?.includes(industry) ? 1 : 0);
    return bScore - aScore;
  }).slice(0, 3);
  if (matchedScripts.length) {
    ctx += "\n\n--- SCRIPT PATTERNS (structure guidance) ---\n";
    matchedScripts.forEach(p => {
      ctx += `• ${p.script_pattern_name}: ${(p.structure || []).join(" → ")}\n`;
      if (p.example_script) ctx += `  Example script:\n${p.example_script}\n`;
    });
  }

  // CTA PATTERNS: goal-match first (max 4)
  const goalCTAs = (ctaPatterns || []).filter(p =>
    p.is_active && p.goal_fit?.some(g => mainGoal?.includes(g) || ["leads","saves","awareness"].includes(g))
  ).slice(0, 4);
  const fallbackCTAs = (ctaPatterns || []).filter(p => p.is_active && !goalCTAs.includes(p)).slice(0, 2);
  const allCTAs = [...goalCTAs, ...fallbackCTAs];
  if (allCTAs.length) {
    ctx += "\n\n--- CTA PATTERNS ---\n";
    allCTAs.forEach(p => {
      ctx += `• [${p.cta_type}] "${p.template}" — e.g. "${p.example_hebrew}"\n`;
    });
  }

  // CAPTION PATTERNS: category or global (max 3)
  const matchedCaptions = (captionPatterns || []).filter(p =>
    p.is_active && (!p.category_fit?.length || p.category_fit.includes(category) || p.category_fit.includes("global"))
  ).slice(0, 3);
  if (matchedCaptions.length) {
    ctx += "\n\n--- CAPTION PATTERNS ---\n";
    matchedCaptions.forEach(p => {
      ctx += `• ${p.pattern_name}: "${p.template}"\n  e.g. "${p.example_hebrew}"\n`;
    });
  }

  // TREND PATTERNS: טרנדי always, others only if category matches (max 3)
  const matchedTrends = (trendPatterns || []).filter(t =>
    t.is_active && (category === "טרנדי" || t.category_fit?.includes(category))
  ).slice(0, 3);
  if (matchedTrends.length) {
    ctx += "\n\n--- TREND FORMATS ---\n";
    matchedTrends.forEach(t => {
      ctx += `• ${t.trend_name}: "${t.example_hebrew}"\n  Adapt: ${t.how_to_adapt}\n`;
    });
  }

  // VOICE SAMPLES: industry match first, then global good/excellent, then category-specific
  const industryVoiceSamples = (voiceSamples || []).filter(s =>
    s.is_active && s.industry === industry && ["good","excellent"].includes(s.rating)
  ).slice(0, 4);
  const goodSamples = (voiceSamples || []).filter(s =>
    s.is_active && (s.category === "global" || s.category === category) &&
    ["good","excellent"].includes(s.rating) && !industryVoiceSamples.includes(s)
  ).slice(0, 3);
  const badSamples = (voiceSamples || []).filter(s =>
    s.is_active && s.category === "global" && ["bad","cringe","american"].includes(s.rating)
  ).slice(0, 2);
  const rewriteSamples = (voiceSamples || []).filter(s =>
    s.is_active && s.sample_type === "rewrite" && s.rating === "excellent"
  ).slice(0, 2);
  const allSamples = [...rewriteSamples, ...industryVoiceSamples, ...goodSamples, ...badSamples];
  if (allSamples.length) {
    ctx += "\n\n--- VOICE SAMPLES (tone reference) ---\n";
    allSamples.forEach(s => {
      if (s.sample_type === "rewrite" && s.input_text && s.output_text) {
        ctx += `• [REWRITE ✓] "${s.input_text}"\n  → "${s.output_text}" — ${s.why}\n`;
      } else if (["good","excellent"].includes(s.rating) && s.output_text) {
        ctx += `• [GOOD] "${s.output_text}" — ${s.why}\n`;
      } else if (s.input_text) {
        ctx += `• [AVOID] "${s.input_text}" — ${s.why}\n`;
      }
    });
  }

  // BRIEF EXAMPLES: category match, then global (max 2)
  const matchedBriefs = (briefExamples || []).filter(e =>
    e.is_active && (e.category === category || e.category === "global" || !e.category)
  ).slice(0, 2);
  if (matchedBriefs.length) {
    ctx += "\n\n--- BRIEF EXAMPLES (structure to imitate, not copy) ---\n";
    matchedBriefs.forEach(e => {
      ctx += `• [${(e.example_type || "").toUpperCase()}] Why it works: ${e.why_it_works}\n${e.example_content}\n`;
    });
  }

  // LEGACY good/bad examples
  const goods = (goodExamples || []).filter(e => e.is_active).slice(0, 2);
  if (goods.length) {
    ctx += "\n\n--- ADDITIONAL GOOD EXAMPLES ---\n";
    goods.forEach(e => ctx += `• "${e.example_text}" — ${e.why_it_works}\n`);
  }
  const bads = (badExamples || []).filter(e => e.is_active).slice(0, 2);
  if (bads.length) {
    ctx += "\n\n--- ADDITIONAL BAD EXAMPLES ---\n";
    bads.forEach(e => ctx += `• "${e.bad_text}" — ${e.why_bad}\n`);
  }

  const isFoodCtx = FOOD_INDUSTRIES.includes(industry) ||
    (voiceSamples || []).some(s => s.industry && FOOD_INDUSTRIES.includes(s.industry) && s.is_active);

  if (isFoodCtx) {
    ctx += "\n\n--- FOOD / BARS / CAFÉS INSTRUCTION ---\nFor food, bars, cafés, and street food, write through real appetite moments and social situations. Use specific visual details: bite, crunch, sauce, table, beer, line, smell, hands preparing food, first reaction. Avoid restaurant PR language (חוויה קולינרית, טעם של עוד, אווירה קסומה, מנות איכותיות, מגוון עשיר). The content should feel like a sharp Israeli recommendation, not a polished ad.\n";
  }

  const isBeautyCtx = BEAUTY_INDUSTRIES.includes(industry) ||
    (voiceSamples || []).some(s => s.industry && BEAUTY_INDUSTRIES.includes(s.industry) && s.is_active);

  if (isBeautyCtx) {
    ctx += "\n\n--- BEAUTY / AESTHETICS INSTRUCTION ---\nFor beauty, nails, brows, lashes, hair, skincare, and aesthetics, write through trust, precision, client fears, and process. Use specific details: face shape, shade, symmetry, preparation, healing, maintenance, aftercare. Do not use: תוצאה מושלמת, חוויה מפנקת, אווירה קסומה, גלואו מטורף, יחס אישי ומקצועי, טיפול שישנה לך את החיים.\n";
  }

  const isFitnessCtx = FITNESS_INDUSTRIES.includes(industry);
  if (isFitnessCtx) {
    ctx += "\n\n--- FITNESS / NUTRITION / PILATES INSTRUCTION ---\nFor fitness, nutrition, Pilates, yoga, and training, write through realistic Israeli life. Avoid American gym motivation. Focus on repeatable routines, beginner fears, Friday dinner, after-holidays, form correction, short workouts, and practical coaching. The tone should be direct but supportive. Do not use: no pain no gain, תנו 110 אחוז, גוף מושלם, בלי תירוצים, פשוט תתמידו.\n";
  }

  const isMarketingCtx = MARKETING_INDUSTRIES.includes(industry);
  if (isMarketingCtx) {
    ctx += "\n\n--- MARKETING / SOCIAL MEDIA INSTRUCTION ---\nFor marketing and social media businesses, start from the client's real pain. Avoid empty strategy words: אסטרטגיה, ערך, מיתוג, תוכן איכותי unless immediately grounded in a concrete example. Use before/after structure: weak hook vs strong hook, generic post vs specific post. Be useful fast — give one practical correction per video.\n";
  }

  const isCoachingCtx = COACHING_INDUSTRIES.includes(industry);
  if (isCoachingCtx) {
    ctx += "\n\n--- COACHING / CONSULTING INSTRUCTION ---\nFor coaches and consultants, create a mirror moment: the viewer feels seen, not preached to. Avoid empty inspiration. Teach one distinction per video. Connect every insight to a concrete behavior, decision, or situation. Do not say: תאמינו בעצמכם, תפרצו גבולות, תכבשו את המטרות.\n";
  }

  const isLocalServiceCtx = LOCAL_SERVICE_INDUSTRIES.includes(industry);
  if (isLocalServiceCtx) {
    ctx += "\n\n--- LOCAL SERVICE / TECHNICIAN INSTRUCTION ---\nFor local services, build trust through practical checks, transparency, before/after, and prevention. Avoid: מקצועי, אמין, שירות מכל הלב without proof. Show what the client should ask, what to check, what a bad quote looks like. Great content prevents a problem.\n";
  }

  const isRealEstateCtx = REAL_ESTATE_INDUSTRIES.includes(industry);
  if (isRealEstateCtx) {
    ctx += "\n\n--- REAL ESTATE / DESIGN / RENOVATION INSTRUCTION ---\nFor real estate and design, show what the buyer/client should notice, not only pretty shots. Balance beauty and function. For renovation, prevent expensive mistakes. Do not use: דירה מהממת, מיקום מושלם, עיצוב יוקרתי, מגשימים חלומות.\n";
  }

  const isEventsCtx = EVENTS_INDUSTRIES.includes(industry);
  if (isEventsCtx) {
    ctx += "\n\n--- EVENTS / WEDDINGS / NIGHTLIFE INSTRUCTION ---\nFor events, sell the moment and social feeling, not venue specs. Avoid: חוויה בלתי נשכחת, אירוע מהחלומות, אווירה קסומה. Show energy, crowd, dance floor, the moment people stop posing and start enjoying.\n";
  }

  ctx += "\n\n--- INSTRUCTION ---\nUse the Content Intelligence rows above as style and structure guidance only. Do not copy them directly. Generate original Israeli short-form content based on the user's specific business, goal, category, selected concept, and previous selections.\n";

  return ctx;
}

function buildDebugSummary({ voiceRules, hookPatterns, scriptPatterns, voiceSamples, briefExamples, category, industry, mainGoal }) {
  const loadedVoiceRules = (voiceRules || []).filter(r =>
    r.is_active && (r.category === "global" || r.category === category)
  ).map(r => `[${r.priority}] ${r.rule_name}`);

  const loadedHookPatterns = (hookPatterns || []).filter(p =>
    p.is_active && (!p.category_fit?.length || p.category_fit.includes(category) || p.category_fit.includes("general"))
  ).slice(0, 5).map(p => p.pattern_name);

  const loadedScriptPatterns = (scriptPatterns || []).filter(p => p.is_active).sort((a, b) => {
    const aScore = (a.category_fit?.includes(category) ? 2 : 0) + (a.industry_fit?.includes(industry) ? 1 : 0);
    const bScore = (b.category_fit?.includes(category) ? 2 : 0) + (b.industry_fit?.includes(industry) ? 1 : 0);
    return bScore - aScore;
  }).slice(0, 3).map(p => p.script_pattern_name);

  const loadedVoiceSamples = [
    ...(voiceSamples || []).filter(s => s.is_active && s.sample_type === "rewrite" && s.rating === "excellent").slice(0, 2),
    ...(voiceSamples || []).filter(s => s.is_active && ["good","excellent"].includes(s.rating) && (s.category === "global" || s.category === category)).slice(0, 3),
    ...(voiceSamples || []).filter(s => s.is_active && ["bad","cringe","american"].includes(s.rating) && s.category === "global").slice(0, 2),
  ].map(s => `[${s.sample_type}/${s.rating}] ${(s.input_text || s.output_text || "").slice(0, 50)}`);

  const loadedBriefExamples = (briefExamples || []).filter(e =>
    e.is_active && (e.category === category || e.category === "global" || !e.category)
  ).slice(0, 2).map(e => `[${e.example_type}] ${e.category || "global"}`);

  return {
    action_category: category,
    action_industry: industry,
    loaded_voice_rules: loadedVoiceRules,
    loaded_hook_patterns: loadedHookPatterns,
    loaded_script_patterns: loadedScriptPatterns,
    loaded_voice_samples: loadedVoiceSamples,
    loaded_brief_examples: loadedBriefExamples,
  };
}

// Verify the authenticated user owns the project before any action
async function verifyProjectOwnership(base44, userId, projectId) {
  if (!projectId) return null; // some actions don't need a project
  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  const project = projects[0];
  if (!project) return null;
  // If owner_id is set, enforce it. If not set (legacy), allow access.
  if (project.owner_id && project.owner_id !== userId) return null;
  return project;
}

// Sanitize text to prevent injection in prompts
function sanitizeText(text, maxLen = 3000) {
  if (!text) return "";
  return String(text).slice(0, maxLen).replace(/[<>]/g, "");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  const body = await req.json();
  const { action, ...payload } = body;

  // Verify project ownership for all project-scoped actions
  const project_id = payload.project_id;
  if (project_id) {
    const ownedProject = await verifyProjectOwnership(base44, user.id, project_id);
    if (!ownedProject) {
      return Response.json({ error: "Forbidden: לא מצאנו את הפרויקט הזה או שאין לך גישה אליו." }, { status: 403 });
    }
  }

  // Sanitize user-supplied text fields to prevent oversized inputs
  if (payload.raw_notes) payload.raw_notes = sanitizeText(payload.raw_notes, 3000);
  if (payload.client_name) payload.client_name = sanitizeText(payload.client_name, 200);
  if (payload.original_text) payload.original_text = sanitizeText(payload.original_text, 1000);
  if (payload.business_context) payload.business_context = sanitizeText(payload.business_context, 1000);

  // Load all intelligence tables in parallel
  const [voiceRules, hookPatterns, captionPatterns, ctaPatterns, scriptPatterns, trendPatterns, voiceSamples, briefExamples, goodExamples, badExamples] = await Promise.all([
    base44.asServiceRole.entities.VoiceRule.list(),
    base44.asServiceRole.entities.HookPattern.list(),
    base44.asServiceRole.entities.CaptionPattern.list(),
    base44.asServiceRole.entities.CTAPattern.list(),
    base44.asServiceRole.entities.ScriptPattern.list(),
    base44.asServiceRole.entities.TrendPattern.list(),
    base44.asServiceRole.entities.VoiceSample.list(),
    base44.asServiceRole.entities.BriefExample.list(),
    base44.asServiceRole.entities.GoodExample.list(),
    base44.asServiceRole.entities.BadExample.list(),
  ]);

  const category = payload.selected_category || "";
  const industry = payload.industry || "general";
  const mainGoal = payload.main_goal || "";

  const intelligenceCtx = buildIntelligenceContext({
    voiceRules, hookPatterns, captionPatterns, ctaPatterns, scriptPatterns, trendPatterns,
    voiceSamples, briefExamples, goodExamples, badExamples,
    category, industry, mainGoal,
  });

  // Debug summary: which rows were actually loaded per table
  const debugSummary = buildDebugSummary({
    voiceRules, hookPatterns, scriptPatterns, voiceSamples, briefExamples,
    category, industry, mainGoal,
  });

  // ── generateCreativeDNA ────────────────────────────────────────────────────
  if (action === "generateCreativeDNA") {
    const { project_id, client_name, main_goal, raw_notes } = payload;
    const prompt = `Analyze this Israeli business and generate Creative DNA for social media content.

Client: ${client_name}
Goal: ${main_goal}
Notes: ${raw_notes}
${intelligenceCtx}

Return JSON:
{
  "main_angle": "The core strategic angle for content",
  "audience_truth": "What the audience actually feels or needs",
  "what_is_interesting": "What is genuinely interesting about this business",
  "what_to_avoid": "What to avoid in content for this business",
  "recommended_content_directions": ["direction1", "direction2", "direction3"]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateCreativeDNA", STRATEGY_MODEL, { client_name, main_goal, raw_notes }, parsed, inputTokens, outputTokens, true);
    await base44.asServiceRole.entities.Project.update(project_id, { creative_dna: parsed });
    return Response.json({ creative_dna: parsed, _debug: debugSummary });
  }

  // ── generateVideoConcepts ──────────────────────────────────────────────────
  if (action === "generateVideoConcepts") {
    const { project_id, client_name, main_goal, raw_notes, creative_dna, selected_category } = payload;
    const prompt = `Generate exactly 4 video concepts for this Israeli business.

Client: ${client_name}
Goal: ${main_goal}
Notes: ${raw_notes || ""}
Category: ${selected_category}
Creative DNA: ${JSON.stringify(creative_dna)}
${intelligenceCtx}

RULES:
- Return exactly 4 concepts, each meaningfully different.
- Hebrew only.
- A concept is the creative IDEA of the video — not the hook or the script yet.
- Do not write the full script. Do not write the CTA.
- Make each concept practical and shootable.
- The viewer should clearly understand what happens in the video and why they would care.
- Each concept must be understandable to a social media manager AND to a client.
- Avoid vague or generic concepts like "show the vibe" or "present professionally".
- Vary the 4: 1) Safe/client-friendly, 2) Social/native, 3) Funny/human, 4) Sharper/emotional.
- Use ScriptPatterns and TrendPatterns for structural inspiration.
- Each concept must explain what is filmed and why someone would stop scrolling.

GOOD concept:
{"concept_title":"למה יש פה תור?","concept_summary":"סרטון שמתחיל מהתור מחוץ למקום ומוביל את הצופה להבין מה גורם לאנשים לעצור דווקא פה.","why_it_works":"התור מייצר סקרנות והוכחה חברתית.","visual_direction":"פתיחה מבחוץ, תור, אנשים מחכים, הכנה מהירה מאחורי הדלפק, ביס ראשון.","tone":"סקרני, אנרגטי","risk_level":"נמוך"}

BAD concept (do NOT do this):
{"concept_title":"סרטון תדמית לעסק","concept_summary":"סרטון שמראה את העסק בצורה טובה.","visual_direction":"צילומים יפים."}

Return JSON:
{
  "concepts": [
    {
      "concept_title": "short punchy title in Hebrew",
      "concept_summary": "2-3 sentences describing exactly what the viewer will see and feel",
      "why_it_works": "1 sentence",
      "visual_direction": "what exactly to film",
      "tone": "tone label",
      "risk_level": "נמוך | בינוני | גבוה"
    }
  ]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateVideoConcepts", STRATEGY_MODEL, { client_name, main_goal, selected_category, creative_dna }, parsed, inputTokens, outputTokens, true);
    return Response.json({ ...parsed, _debug: debugSummary });
  }

  // ── generateHooks ──────────────────────────────────────────────────────────
  if (action === "generateHooks") {
    const { project_id, client_name, main_goal, raw_notes, creative_dna, selected_category, selected_concept } = payload;
    const prompt = `Generate exactly 4 hook options for this specific video concept.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Selected concept: ${JSON.stringify(selected_concept)}
Creative DNA: ${JSON.stringify(creative_dna)}
${intelligenceCtx}

RULES:
- Return exactly 4 hooks.
- Hebrew only.
- Hooks are ONLY for the selected concept above. Do NOT write generic hooks for the whole business.
- A hook is the opening line — max 1-2 short sentences that make someone stop scrolling in the first 2 seconds.
- Do NOT write explanatory hooks that summarize the whole video.
- Use HookPatterns for structure but adapt to this specific concept.
- Vary: 1) Safe/client-friendly, 2) Social/native, 3) Funny/human, 4) Sharper/riskier.

BAD hook (too long, explains everything): "עונה על כל השאלות שלכם לגבי המקום: למה יש תור, מה כל כך מיוחד, ולמה אנשים חוזרים."
GOOD hooks: "מה יש בפיתה הזאת שגורם לאנשים לעמוד בתור?" / "עוד דוכן פיתה? לא בדיוק." / "אם יש תור, כנראה שיש סיבה."

Return JSON:
{
  "hooks": [
    {
      "hook_title": "short title",
      "hook_text": "the actual opening line — short, punchy, max 2 seconds spoken",
      "why_it_works": "brief explanation",
      "risk_level": "נמוך | בינוני | גבוה",
      "best_for": "who this works best for"
    }
  ]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateHooks", FAST_MODEL, { client_name, main_goal, selected_category, selected_concept, creative_dna }, parsed, inputTokens, outputTokens, true);
    return Response.json({ ...parsed, _debug: debugSummary });
  }

  // ── generateBodyOptions ────────────────────────────────────────────────────
  if (action === "generateBodyOptions") {
    const { project_id, client_name, main_goal, creative_dna, selected_category, selected_hook, selected_concept } = payload;
    const prompt = `Generate exactly 4 script and body structure options for this video.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Creative DNA: ${JSON.stringify(creative_dna)}
Selected concept: ${JSON.stringify(selected_concept)}
Selected hook: ${JSON.stringify(selected_hook)}
${intelligenceCtx}

RULES:
- Return exactly 4 options, each based on the selected concept AND hook above.
- Each option must be realistic to shoot with a phone.
- Give concrete, specific shots — NOT "show the vibe".
- Include script_direction: what exactly is said or shown as text.
- script_format must be one of: voiceover, person_to_camera, dialogue, text_only.
- Vary: 1) Simple/low-effort, 2) Visual/cinematic, 3) Person talking to camera, 4) Text-only.
- shot_flow must list at least 3-4 specific shots.

Return JSON:
{
  "body_options": [
    {
      "body_title": "short name",
      "script_format": "voiceover | person_to_camera | dialogue | text_only",
      "concept_summary": "1-2 sentence description",
      "script_direction": "what exactly is said or shown as text in this option",
      "shot_flow": ["shot 1", "shot 2", "shot 3", "shot 4"],
      "text_overlays": ["overlay 1", "overlay 2"],
      "production_notes": "specific filming note",
      "why_this_structure_works": "why this fits the hook and concept"
    }
  ]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateBodyOptions", STRATEGY_MODEL, { client_name, selected_category, selected_hook, selected_concept, creative_dna }, parsed, inputTokens, outputTokens, true);
    return Response.json({ ...parsed, _debug: debugSummary });
  }

  // ── generateCTAOptions ─────────────────────────────────────────────────────
  if (action === "generateCTAOptions") {
    const { project_id, client_name, main_goal, creative_dna, selected_category, selected_hook, selected_body, selected_concept } = payload;
    const prompt = `Generate exactly 4 CTA options for this video.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Selected concept: ${JSON.stringify(selected_concept)}
Selected hook: ${JSON.stringify(selected_hook)}
Selected body: ${JSON.stringify(selected_body)}
${intelligenceCtx}

Use CTAPatterns. Match the main_goal. Return exactly these 4 types in order: ישיר, רך, שמירה / שיתוף, פנייה / הודעה.
Strong clear CTAs are allowed. Do not apologize for selling.

Return JSON:
{
  "ctas": [
    {
      "cta_type": "ישיר | רך | שמירה / שיתוף | פנייה / הודעה",
      "cta_text": "the actual CTA text in Hebrew",
      "why_it_fits": "why this CTA fits"
    }
  ]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateCTAOptions", FAST_MODEL, { client_name, main_goal, selected_category, selected_hook, selected_body }, parsed, inputTokens, outputTokens, true);
    return Response.json({ ...parsed, _debug: debugSummary });
  }

  // ── assembleFinalBrief ─────────────────────────────────────────────────────
  if (action === "assembleFinalBrief") {
    const { project_id, client_name, main_goal, creative_dna, selected_category, selected_hook, selected_body, selected_cta, selected_concept } = payload;
    const prompt = `Assemble a final client-ready, shootable video brief.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Creative DNA: ${JSON.stringify(creative_dna)}
Selected concept: ${JSON.stringify(selected_concept)}
Selected hook: ${JSON.stringify(selected_hook)}
Selected body: ${JSON.stringify(selected_body)}
Selected CTA: ${JSON.stringify(selected_cta)}
${intelligenceCtx}

CRITICAL RULES:
- Hebrew only.
- video_concept must be based on selected_concept — make it clear and 1-2 sentences.
- hook must be short — the exact opening line, max 1-2 seconds spoken. Do not rewrite it longer.
- script_text is MANDATORY. Must be the actual full spoken text, voiceover, or text-led script. Natural spoken Hebrew. Not empty, not vague.
- Use ScriptPatterns and VoiceSamples to shape script_text.
- shot_structure must describe exactly what to film and what is said/shown at each step.
- Avoid generic copy like "present the vibe" or "show the business professionally".
- If the video works better without spoken audio, use script_format: "text_only" and strengthen text_overlays.
- Use CaptionPatterns for caption_suggestion.
- The brief must be shootable tomorrow with a phone.
- Do not return a brief without script_text.

Return JSON:
{
  "brief_title": "short descriptive title",
  "video_concept": "1-2 sentence concept in Hebrew",
  "hook": "the hook — short, exact as it opens the video",
  "script_format": "voiceover | person_to_camera | dialogue | text_only",
  "script_text": "the full spoken script or text-led script — complete, natural Hebrew, usable immediately",
  "shot_structure": [
    { "step": 1, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" },
    { "step": 2, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" },
    { "step": 3, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" },
    { "step": 4, "visual": "what is filmed", "spoken_or_overlay_text": "what is said or shown" }
  ],
  "text_overlays": ["overlay 1", "overlay 2"],
  "cta": "the CTA text",
  "caption_suggestion": "social caption in Hebrew",
  "production_notes": "specific practical filming notes — location, lighting, pace, tone",
  "client_risk_level": "נמוך | בינוני | גבוה"
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "assembleFinalBrief", STRATEGY_MODEL, { client_name, selected_category, selected_hook, selected_body, selected_cta, selected_concept }, parsed, inputTokens, outputTokens, true);
    return Response.json({ final_brief: parsed, _debug: debugSummary });
  }

  // ── checkBriefQuality ──────────────────────────────────────────────────────
  if (action === "checkBriefQuality") {
    const { project_id, video_brief_id, client_name, main_goal, selected_category, selected_concept, final_brief } = payload;

    const isFood = FOOD_INDUSTRIES.includes(industry);
    const isBeauty = BEAUTY_INDUSTRIES.includes(industry);
    const isFitness = FITNESS_INDUSTRIES.includes(industry);
    const isMarketing = MARKETING_INDUSTRIES.includes(industry);
    const isCoaching = COACHING_INDUSTRIES.includes(industry);
    const isLocalService = LOCAL_SERVICE_INDUSTRIES.includes(industry);
    const isRealEstate = REAL_ESTATE_INDUSTRIES.includes(industry);
    const isEvents = EVENTS_INDUSTRIES.includes(industry);

    const beautyQualitySection = isBeauty ? `
BEAUTY-SPECIFIC EXTRA CHECKS (apply when industry is beauty/aesthetics/nails/brows/lashes/hair/skincare/clinic):
1. Does the hook address a real client fear or desire (not generic)?
2. Does the concept build trust, not only show a result?
3. Does the script include specific beauty/professional details (face shape, shade, symmetry, prep, healing, aftercare)?
4. Does it avoid fake luxury and generic beauty ad language?
5. Does it avoid overpromising?
6. Does it include process, consultation, or aftercare when relevant?
7. Does the CTA match beauty behavior: save before appointment, send to friend, DM for consultation?
8. Can this be shot tomorrow with phone footage?
9. Does it sound natural and client-safe?

BEAUTY PENALTY RULES:
- If the brief contains any of these phrases, REDUCE israeli_tone_score and client_safe_score by 2 points each (unless used ironically):
  תוצאה מושלמת, חוויה מפנקת, אווירה קסומה, גלואו מטורף, יחס אישי ומקצועי, טיפול שישנה לך את החיים
- If script_text has no specific beauty detail or process detail, set needs_rewrite to true regardless of overall_score.
` : "";

    const foodQualitySection = isFood ? `
FOOD-SPECIFIC EXTRA CHECKS (apply when industry is food/bars/cafés/street food):
1. Is the hook short and appetite/socially driven (NOT generic or PR-like)?
2. Does the concept include a real food situation (not just "show the vibe")?
3. Does the script include specific visual food details (bite, crunch, sauce, line, hands)?
4. Does it AVOID generic restaurant PR language?
5. Does the CTA match food behavior: save, send, tag, visit, group decision?
6. Can this be shot tomorrow with phone footage?
7. Is there at least one concrete food visual?
8. Does it sound Israeli and natural when spoken aloud?

FOOD PENALTY RULES:
- If the brief contains any of these phrases, REDUCE israeli_tone_score and clarity_score by 2 points (unless used ironically):
  חוויה קולינרית, טעם של עוד, אווירה קסומה, מנות איכותיות, מגוון עשיר, שירות ברמה הגבוהה ביותר
- If script_text has no concrete food visual detail, set needs_rewrite to true regardless of overall_score.
` : "";

    const fitnessQualitySection = isFitness ? `
FITNESS-SPECIFIC EXTRA CHECKS:
1. Does the hook address a real behavior or fear (not imported gym motivation)?
2. Does the concept feel realistic for Israeli life?
3. Does the script avoid gym bro language (no pain no gain, תנו 110 אחוז)?
4. Does it avoid shame-heavy language?
5. Does it include practical action, correction, or routine?
6. Does the CTA match fitness behavior: save workout, send to partner, comment goal, DM for plan?
7. Can this be shot tomorrow with phone footage?

PENALTY: Reduce israeli_tone_score and client_safe_score by 2 if brief contains: no pain no gain, תנו 110 אחוז, גוף מושלם, בלי תירוצים.
PENALTY: If script_text has no practical fitness/nutrition detail, set needs_rewrite to true.
` : "";

    const marketingQualitySection = isMarketing ? `
MARKETING-SPECIFIC EXTRA CHECKS:
1. Does the hook call out a real client pain (not "strategy" language)?
2. Does the concept give a practical correction quickly?
3. Does the script avoid empty agency words: אסטרטגיה, ערך, מיתוג, תוכן איכותי?
4. Does it use before/after or contrast structure?
5. Can the viewer save this and use it tomorrow?

PENALTY: Reduce israeli_tone_score by 2 if brief sounds like agency pitch.
` : "";

    const coachingQualitySection = isCoaching ? `
COACHING-SPECIFIC EXTRA CHECKS:
1. Does the hook create a mirror moment (viewer feels seen)?
2. Does the script teach exactly one distinction?
3. Does it avoid empty inspiration (תאמינו בעצמכם, תפרצו גבולות)?
4. Is every insight connected to a concrete behavior or decision?

PENALTY: Reduce client_safe_score by 2 if brief sounds like generic motivation.
` : "";

    const localServiceQualitySection = isLocalService ? `
LOCAL SERVICE-SPECIFIC EXTRA CHECKS:
1. Does the hook address trust, prevention, or a real service mistake?
2. Does the content include specific checks the client should do?
3. Does it avoid: מקצועי, אמין, שירות מכל הלב without proof?
4. Does the CTA match save/send/photo-DM/checklist behavior?

PENALTY: Reduce client_safe_score by 2 if only uses generic service phrases.
` : "";

    const realEstateQualitySection = isRealEstate ? `
REAL ESTATE/DESIGN-SPECIFIC EXTRA CHECKS:
1. Does the content show what the buyer/client should notice (not just pretty shots)?
2. Does it balance beauty and function?
3. Does it avoid: דירה מהממת, מיקום מושלם, עיצוב יוקרתי, מגשימים חלומות?
4. Does it prevent a mistake or reveal an overlooked detail?
` : "";

    const eventsQualitySection = isEvents ? `
EVENTS/WEDDINGS-SPECIFIC EXTRA CHECKS:
1. Does the content sell the moment and social feeling (not just specs)?
2. Does it avoid: חוויה בלתי נשכחת, אירוע מהחלומות, אווירה קסומה?
3. Does it show energy, crowd, or the real party moment?
` : "";

    const prompt = `You are a strict Israeli social media brief quality checker.

Check this video brief and score it honestly. Be strict. Do not praise weak briefs.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Industry: ${industry}
Selected concept: ${JSON.stringify(selected_concept)}
Final brief: ${JSON.stringify(final_brief)}
${intelligenceCtx}
${beautyQualitySection}
${foodQualitySection}
${fitnessQualitySection}
${marketingQualitySection}
${coachingQualitySection}
${localServiceQualitySection}
${realEstateQualitySection}
${eventsQualitySection}

UNIVERSAL QUALITY PENALTIES (Batch 10 — apply to all industries):
REDUCE overall_score by 1 for each of these issues found:
- Hook is longer than 12 Hebrew words
- Hook explains the whole video instead of creating curiosity
- Concept is vague ("show the vibe", "present professionally")
- Script has no concrete situation or real-life moment
- Script sounds like a brochure or ad
- Script has no complete spoken line
- Shot structure is generic
- CTA does not match the business goal or industry
- Copy sounds American/guru-like
- The same idea is repeated across options
- The business category could be swapped and the text still works

PENALIZE THESE GENERIC PHRASES (reduce israeli_tone_score by 1 each if found):
חוויה בלתי נשכחת, טעם של עוד, שירות מקצועי ואמין, איכות ללא פשרות, פתרון מושלם, אווירה קסומה, מגוון עשיר, לקחת את העסק לשלב הבא, למקסם תוצאות, ערך אמיתי, תוכן איכותי, שיווק מנצח, תוצאה מושלמת, יחס אישי ומקצועי

POSITIVE SCORING BONUS:
Add +0.5 to overall_score for each found:
- Starts from a real situation or specific behavior
- Includes a concrete visual detail
- Includes natural spoken Hebrew
- Has one clear idea per video
- Has a shootable structure
- CTA matches save/share/comment/DM/booking behavior
- Uses relevant industry patterns

SCORING RULES (1-10, be strict):
- hook_score: Is the hook short enough for the first 2 seconds? Is it specific to the concept?
- concept_score: Is the concept clear, not vague, and specific enough to shoot?
- script_score: Does script_text sound like natural spoken Hebrew? Is it complete and usable?
- clarity_score: Can a social media manager read this and know exactly what to film?
- israeli_tone_score: Does it sound like real Israeli copy? Not American-translated?
- client_safe_score: Can this be approved by a typical Israeli business owner?
- shootability_score: Can this be filmed tomorrow with a phone?
- overall_score: Weighted average. Penalize hard if script_text is missing or vague.
- needs_rewrite: true if overall_score < 8.

Return JSON:
{
  "overall_score": 0,
  "hook_score": 0,
  "concept_score": 0,
  "script_score": 0,
  "clarity_score": 0,
  "israeli_tone_score": 0,
  "client_safe_score": 0,
  "shootability_score": 0,
  "issues": ["issue 1", "issue 2"],
  "fix_suggestions": ["fix 1", "fix 2"],
  "needs_rewrite": true
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);

    // Save quality check
    await base44.asServiceRole.entities.BriefQualityCheck.create({
      project_id,
      video_brief_id,
      overall_score: parsed.overall_score,
      hook_score: parsed.hook_score,
      concept_score: parsed.concept_score,
      script_score: parsed.script_score,
      clarity_score: parsed.clarity_score,
      israeli_tone_score: parsed.israeli_tone_score,
      client_safe_score: parsed.client_safe_score,
      shootability_score: parsed.shootability_score,
      issues: parsed.issues || [],
      fix_suggestions: parsed.fix_suggestions || [],
      needs_rewrite: parsed.needs_rewrite || false,
    });

    await saveGeneration(base44, user.id, project_id, "checkBriefQuality", FAST_MODEL, { client_name, selected_category, selected_concept }, parsed, inputTokens, outputTokens, true);
    return Response.json({ ...parsed, _debug: debugSummary });
  }

  // ── improveFinalBrief ──────────────────────────────────────────────────────
  if (action === "improveFinalBrief") {
    const { project_id, video_brief_id, original_brief, quality_check, client_name, main_goal, selected_category, selected_concept, creative_dna, feedback_tags } = payload;
    const prompt = `Improve this Israeli video brief based on the quality check results.

Client: ${client_name}
Goal: ${main_goal}
Category: ${selected_category}
Selected concept: ${JSON.stringify(selected_concept)}
Creative DNA: ${JSON.stringify(creative_dna)}
${intelligenceCtx}

Original brief:
${JSON.stringify(original_brief)}

Quality check issues:
${JSON.stringify(quality_check?.issues || [])}

Fix suggestions:
${JSON.stringify(quality_check?.fix_suggestions || [])}

${feedback_tags?.length ? `User feedback: ${feedback_tags.join(", ")}` : ""}

REWRITE PRIORITIES (Batch 10):
1. Shorten hook to max 12 Hebrew words.
2. Make concept more specific — remove all vague language.
3. Add a real situation or concrete behavior.
4. Make script_text complete and naturally spoken in Hebrew.
5. Add concrete shot descriptions.
6. Replace generic CTA with industry-appropriate CTA.
7. Remove all generic phrases from the penalty list.
8. Make Hebrew more spoken, less polished.

RULES:
- Fix the issues found in the quality check.
- Keep the core concept if it is good — do not change the whole video.
- Make the hook shorter if needed (max 12 words).
- Make the concept clearer if needed — replace vague descriptions.
- Make script_text more natural and spoken Hebrew.
- Make shot_structure more practical and specific.
- The brief must be shootable tomorrow.
- script_text is MANDATORY and must be complete.
- Hebrew only.
- Use VoiceSamples and BriefExamples as reference.
- Do not simply polish wording — rewrite structurally if score was below 8.

Return the same JSON schema as the final brief:
{
  "brief_title": "",
  "video_concept": "",
  "hook": "",
  "script_format": "voiceover | person_to_camera | dialogue | text_only",
  "script_text": "",
  "shot_structure": [
    { "step": 1, "visual": "", "spoken_or_overlay_text": "" },
    { "step": 2, "visual": "", "spoken_or_overlay_text": "" },
    { "step": 3, "visual": "", "spoken_or_overlay_text": "" },
    { "step": 4, "visual": "", "spoken_or_overlay_text": "" }
  ],
  "text_overlays": [],
  "cta": "",
  "caption_suggestion": "",
  "production_notes": "",
  "client_risk_level": ""
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "improveFinalBrief", STRATEGY_MODEL, { client_name, selected_category, selected_concept, original_brief, quality_check }, parsed, inputTokens, outputTokens, true);
    return Response.json({ final_brief: parsed, _debug: debugSummary });
  }

  // ── generateClientBriefSummary ─────────────────────────────────────────────
  if (action === "generateClientBriefSummary") {
    const { project_id, client_name, main_goal, creative_dna, video_briefs } = payload;
    const prompt = `Create short, client-friendly summaries for each of these video briefs.

Client: ${client_name}
Goal: ${main_goal}
Creative DNA: ${JSON.stringify(creative_dna)}
Video Briefs: ${JSON.stringify(video_briefs)}

RULES:
- Hebrew only.
- Each summary must be short and easy for a business owner to approve.
- Do NOT include internal production details, long voiceover scripts, or technical jargon.
- Keep tone professional, simple, confident.
- Each video should take 20-40 seconds to read.

Return JSON:
{
  "client_briefs": [
    {
      "brief_title": "video title",
      "category": "category",
      "short_client_concept": "2-3 sentence concept for a business owner",
      "hook": "the hook as it will open the video",
      "short_visual_summary": "1-2 sentences describing what the viewer will see",
      "cta": "the call to action"
    }
  ]
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, STRATEGY_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "generateClientBriefSummary", STRATEGY_MODEL, { client_name, main_goal }, parsed, inputTokens, outputTokens, true);
    return Response.json(parsed);
  }

  // ── rewriteOption ──────────────────────────────────────────────────────────
  if (action === "rewriteOption") {
    const { project_id, original_text, rewrite_action, business_context, selected_category } = payload;
    const prompt = `Rewrite this text with the following instruction: "${rewrite_action}"

Original text: "${original_text}"
Business context: ${business_context || ""}
Category: ${selected_category || ""}
${intelligenceCtx}

Keep it in natural Israeli Hebrew. Make it practical and usable.

Return JSON:
{
  "rewritten_text": "the rewritten version",
  "what_changed": "1 short sentence explaining what changed"
}`;

    const { parsed, inputTokens, outputTokens } = await callOpenAI(openai, FAST_MODEL, prompt);
    await saveGeneration(base44, user.id, project_id, "rewriteOption", FAST_MODEL, { original_text, rewrite_action, selected_category }, parsed, inputTokens, outputTokens, true);
    return Response.json(parsed);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});