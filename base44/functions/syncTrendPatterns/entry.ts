import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Migrated to Grok — no OpenAI dependency
const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";

const TREND_DISCOVERY_PROMPT = `You are a social media trend researcher specializing in Israeli short-form video content (TikTok, Instagram Reels, YouTube Shorts).

Your task: identify 6-8 currently relevant video format/style trends for Israeli social media creators and businesses.

Focus on:
- Format trends (POV, day-in-my-life, "things I noticed", behind-the-scenes, side-by-side comparison, transformation, etc.)
- Editing style trends (text-on-screen storytelling, reaction face + product, before/after, etc.)
- Behavioral trends popular on Israeli social media
- Trends that work for local businesses (food, beauty, fitness, services, coaching)

For each trend, provide:
- A clear Hebrew name and short description
- How it works structurally
- How to adapt it to Israeli business content
- A concrete Hebrew example
- Freshness status: current, stable, or outdated

Return ONLY valid JSON. No markdown.

{"trends":[{"trend_name":"","platform":"TikTok|Reels|Shorts|General","structure":"","how_to_adapt":"","example_hebrew":"","category_fit":[],"risk_notes":"","freshness_status":"current|stable|outdated"}]}`;

async function callGrok(userPrompt) {
  const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: TREND_DISCOVERY_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`xAI error: ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Grok");
  return content;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

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

  if (!XAI_API_KEY) return Response.json({ error: "XAI_API_KEY is not set" }, { status: 500 });

  const existingTrends = await base44.asServiceRole.entities.TrendPattern.list();
  const existingNames = existingTrends.map(t => t.trend_name).filter(Boolean);

  const userPrompt = `Discover current Israeli social media trends. Today: ${new Date().toISOString().split("T")[0]}.
${existingNames.length ? `\nAlready in database (do NOT duplicate): ${existingNames.join(", ")}` : ""}
Focus on trends CURRENTLY relevant for Israeli businesses.`;

  const raw = await callGrok(userPrompt);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const newTrends = parsed.trends || [];

  // Mark outdated
  const outdatedFromGrok = newTrends.filter(t => t.freshness_status === "outdated").map(t => t.trend_name.toLowerCase().trim());
  let outdatedCount = 0;
  if (outdatedFromGrok.length > 0) {
    for (const trend of existingTrends) {
      if (trend.is_active && outdatedFromGrok.some(n => trend.trend_name?.toLowerCase().includes(n) || n.includes(trend.trend_name?.toLowerCase()))) {
        await base44.asServiceRole.entities.TrendPattern.update(trend.id, { freshness_status: "outdated", is_active: false });
        outdatedCount++;
      }
    }
  }

  // Insert new (skip duplicates)
  const existingNamesLower = existingNames.map(n => n.toLowerCase().trim());
  const toInsert = newTrends.filter(t => t.trend_name && !existingNamesLower.includes(t.trend_name.toLowerCase().trim()));

  let inserted = 0;
  for (const trend of toInsert) {
    await base44.asServiceRole.entities.TrendPattern.create({
      pattern_name: trend.trend_name,
      trend_name: trend.trend_name,
      core_mechanic: trend.structure || "",
      why_it_works: trend.how_to_adapt || "",
      briefi_adaptation: trend.how_to_adapt || "",
      example_israeli: trend.example_hebrew || "",
      source_name: "grok_sync",
      source_month: new Date().toISOString().slice(0, 7),
      source_type: "auto_sync",
      is_active: trend.freshness_status !== "outdated",
    });
    inserted++;
  }

  return Response.json({
    success: true,
    provider: "grok",
    trends_discovered: newTrends.length,
    trends_inserted: inserted,
    trends_skipped_duplicate: newTrends.length - inserted,
    trends_marked_outdated: outdatedCount,
    timestamp: new Date().toISOString(),
  });
});