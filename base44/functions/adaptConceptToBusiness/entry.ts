import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SYSTEM_PROMPT = `You are Briefi Adaptation Engine.

You do NOT create new video concepts from scratch.
You adapt an existing Briefi concept to a specific Israeli business.

Rules:
- Keep the original concept logic.
- Do not invent a different core idea.
- Adapt the scene, spoken lines, visual details, CTA and caption to the business.
- Write in natural Israeli Hebrew.
- Sound like Israeli Reels/TikTok, not an agency.
- Avoid polished marketing phrases.
- Make it practical enough to shoot tomorrow.
- Keep it short, clear and street-level.

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { business, selectedConcept } = await req.json();
    if (!business || !selectedConcept) {
      return Response.json({ error: "business and selectedConcept are required" }, { status: 400 });
    }

    const userPrompt = `Business:
${JSON.stringify(business, null, 2)}

Selected concept:
${JSON.stringify(selectedConcept, null, 2)}`;

    const grokRes = await base44.functions.invoke("callGrok", {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.7,
    });

    const raw = grokRes.data?.content;
    if (!raw) return Response.json({ error: "No response from Grok" }, { status: 502 });

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});