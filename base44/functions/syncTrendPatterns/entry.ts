import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.68.0';

const STRATEGY_MODEL = Deno.env.get("OPENAI_STRATEGY_MODEL") || "gpt-4o";

const TREND_DISCOVERY_PROMPT = `You are a social media trend researcher specializing in Israeli short-form video content (TikTok, Instagram Reels, YouTube Shorts).

Your task: identify 6-8 currently relevant video format/style trends for Israeli social media creators and businesses.

Focus on:
- Format trends (POV, day-in-my-life, "things I noticed", behind-the-scenes, side-by-side comparison, "tell me you X without telling me", get-ready-with-me, transformation, etc.)
- Editing style trends (text-on-screen storytelling, reaction face + product, before/after split-screen, etc.)
- Behavioral trends popular on Israeli social media
- Trends that work for local businesses (food, beauty, fitness, services, coaching)

For each trend, provide:
- A clear Hebrew name and short description
- How it works structurally
- How to adapt it to Israeli business content
- A concrete Hebrew example
- Category fit: which content categories it works best for
- Platform it's strongest on
- Freshness status: current (trending now), stable (evergreen), or outdated

Return valid JSON only. No markdown.

{
  "trends": [
    {
      "trend_name": "שם הטרנד",
      "platform": "TikTok | Reels | Shorts | General",
      "structure": "תיאור המבנה - איך זה עובד",
      "how_to_adapt": "איך להתאים לעסקים ישראליים",
      "example_hebrew": "דוגמה ספציפית בעברית",
      "category_fit": ["מצחיק", "תדמית", "מכירתי"],
      "risk_notes": "הערת סיכון אם יש",
      "freshness_status": "current | stable | outdated"
    }
  ]
}`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled (no user) and manual admin invocation
  let isScheduled = false;
  try {
    const body = await req.clone().json();
    isScheduled = body?.args?.scheduled === true || body?.automation?.type === "scheduled";
  } catch { /* ignore */ }

  if (!isScheduled) {
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }
  }

  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

  // 1. Fetch existing active trends to avoid duplication
  const existingTrends = await base44.asServiceRole.entities.TrendPattern.list();
  const existingNames = existingTrends.map(t => t.trend_name).filter(Boolean);

  // 2. Call LLM to discover current trends
  const response = await openai.chat.completions.create({
    model: STRATEGY_MODEL,
    temperature: 0.6,
    max_completion_tokens: 3000,
    messages: [
      {
        role: "system",
        content: TREND_DISCOVERY_PROMPT
      },
      {
        role: "user",
        content: `Discover current Israeli social media trends. Today's date: ${new Date().toISOString().split("T")[0]}.
${existingNames.length ? `\nAlready in database (do NOT duplicate): ${existingNames.join(", ")}` : ""}
\nFocus on trends that are CURRENTLY relevant or evergreen for Israeli businesses.`
      }
    ],
    response_format: { type: "json_object" }
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const newTrends = parsed.trends || [];

  // 3. Mark outdated existing trends
  const outdatedCount = await markOutdatedTrends(base44, newTrends);

  // 4. Insert new trends (skip duplicates by name)
  const existingNamesLower = existingNames.map(n => n.toLowerCase().trim());
  const toInsert = newTrends.filter(t =>
    t.trend_name && !existingNamesLower.includes(t.trend_name.toLowerCase().trim())
  );

  let inserted = 0;
  for (const trend of toInsert) {
    await base44.asServiceRole.entities.TrendPattern.create({
      trend_name: trend.trend_name,
      platform: trend.platform || "General",
      structure: trend.structure || "",
      how_to_adapt: trend.how_to_adapt || "",
      example_hebrew: trend.example_hebrew || "",
      category_fit: trend.category_fit || [],
      risk_notes: trend.risk_notes || "",
      freshness_status: trend.freshness_status || "stable",
      is_active: true,
    });
    inserted++;
  }

  // 5. Log the sync
  const usage = response.usage || {};
  await base44.asServiceRole.entities.ApiUsage.create({
    user_id: "system_scheduler",
    project_id: null,
    action_type: "syncTrendPatterns",
    model: STRATEGY_MODEL,
    input_tokens: usage.prompt_tokens || 0,
    output_tokens: usage.completion_tokens || 0,
    estimated_cost_usd: ((usage.prompt_tokens || 0) / 1000) * 0.0025 + ((usage.completion_tokens || 0) / 1000) * 0.01,
  });

  return Response.json({
    success: true,
    trends_discovered: newTrends.length,
    trends_inserted: inserted,
    trends_skipped_duplicate: newTrends.length - inserted,
    trends_marked_outdated: outdatedCount,
    existing_total: existingTrends.length,
    timestamp: new Date().toISOString(),
  });
});

async function markOutdatedTrends(base44, freshTrends) {
  // If the LLM explicitly marks a trend as outdated, find matching DB records and update them
  const outdatedFromLLM = freshTrends.filter(t => t.freshness_status === "outdated").map(t => t.trend_name.toLowerCase().trim());
  if (!outdatedFromLLM.length) return 0;

  const existing = await base44.asServiceRole.entities.TrendPattern.list();
  let count = 0;
  for (const trend of existing) {
    if (trend.is_active && trend.freshness_status !== "outdated" &&
        outdatedFromLLM.some(name => trend.trend_name?.toLowerCase().includes(name) || name.includes(trend.trend_name?.toLowerCase()))) {
      await base44.asServiceRole.entities.TrendPattern.update(trend.id, { freshness_status: "outdated", is_active: false });
      count++;
    }
  }
  return count;
}