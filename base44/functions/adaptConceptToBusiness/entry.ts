import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";

const SYSTEM_PROMPT = `You are Briefi Adaptation Engine.

You do NOT create new video concepts from scratch.
You adapt an existing Briefi concept to a specific Israeli business.

Rules:
- Keep the original concept logic exactly.
- Do not invent a different core idea.
- Adapt only: scene details, spoken lines, visual specifics, CTA and caption.
- Write in natural Israeli Hebrew — like a real person talking, not an agency.
- Sound like Israeli Reels/TikTok content, not corporate marketing.
- Make it practical and shootable tomorrow with a phone.
- Keep it short, clear and street-level.

Forbidden phrases (never use):
- "חוויה בלתי נשכחת"
- "בואו ליהנות"
- "המקום המושלם"
- "עקבו לעוד"
- "אתם חייבים לראות"
- "חוויה מדהימה"
- "שירות מקצועי ואיכותי"

Return ONLY valid JSON. No markdown. No explanation outside the JSON.

Return JSON:
{
  "adapted_concept_name": "",
  "opening_line": "",
  "one_sentence_concept": "",
  "shooting_brief": [
    {
      "scene": 1,
      "shot": "",
      "spoken_line": "",
      "on_screen_text": "",
      "camera_note": ""
    }
  ],
  "caption": "",
  "cta": "",
  "visual_must_haves": [],
  "why_it_fits_this_business": "",
  "risk_notes": ""
}`;

async function callGrokDirect(systemPrompt, userPrompt, temperature = 0.7) {
  const apiRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    throw new Error(`xAI API error: ${apiRes.status} — ${errText}`);
  }

  const data = await apiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from xAI");
  return content;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (!XAI_API_KEY) return Response.json({ error: "XAI_API_KEY is not set" }, { status: 500 });

    const { business, selectedConcept } = await req.json();
    if (!business || !selectedConcept) {
      return Response.json({ error: "business and selectedConcept are required" }, { status: 400 });
    }

    const userPrompt = `Business:
${JSON.stringify(business, null, 2)}

Selected concept to adapt (do NOT replace this concept — only personalize it):
${JSON.stringify(selectedConcept, null, 2)}`;

    const raw = await callGrokDirect(SYSTEM_PROMPT, userPrompt, 0.7);

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});