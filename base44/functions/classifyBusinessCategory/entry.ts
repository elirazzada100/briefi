import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";

const CATEGORIES = [
  { id: "food_restaurants", name_he: "מסעדנות ואוכל" },
  { id: "beauty_aesthetics", name_he: "יופי ואסתטיקה" },
  { id: "fitness_nutrition", name_he: "פיטנס ותזונה" },
  { id: "coaches_consultants", name_he: "מאמנים, יועצים ונותני ידע" },
  { id: "local_services", name_he: "עסקים מקומיים ושירותים לבית" },
  { id: "real_estate_interiors", name_he: "נדל״ן, עיצוב פנים ושיפוצים" },
  { id: "events_nightlife", name_he: "אירועים, לילה וחוויות" },
  { id: "fashion_boutiques", name_he: "אופנה, תכשיטים ובוטיקים" },
  { id: "parenting_family", name_he: "הורות, ילדים ומשפחה" },
  { id: "health_wellness", name_he: "בריאות, טיפול ו-Wellness" },
];

const SYSTEM_PROMPT = `You are Briefi Category Classifier.

Your job is to classify an Israeli business into exactly ONE of Briefi's 10 fixed business categories.

Do not invent new categories.
Do not generate content ideas.
Do not write marketing copy.
Only classify the business.

Return ONLY valid JSON. No markdown. No explanations outside the JSON.

Available categories:
1. food_restaurants = מסעדנות ואוכל — Restaurants, cafés, bars, street food, bakeries, pizza, burgers, shawarma, desserts, hummus, falafel.
2. beauty_aesthetics = יופי ואסתטיקה — Nails, hair, brows, lashes, makeup, skincare, laser, botox, aesthetic clinics, waxing, threading, dermaplaning.
3. fitness_nutrition = פיטנס ותזונה — Personal trainers, gyms, pilates, yoga, nutrition, weight loss, body transformation, crossfit, spinning.
4. coaches_consultants = מאמנים, יועצים ונותני ידע — Business coaches, marketing consultants, mentors, career coaches, course creators, AI consultants, life coaches.
5. local_services = עסקים מקומיים ושירותים לבית — Plumbers, electricians, cleaners, movers, AC technicians, renovators, locksmiths, gardeners, handymen.
6. real_estate_interiors = נדל״ן, עיצוב פנים ושיפוצים — Real estate agents, mortgage advisors, interior designers, architects, furniture, kitchens, home styling.
7. events_nightlife = אירועים, לילה וחוויות — Event producers, DJs, clubs, weddings, photographers, birthday parties, bar mitzvahs, bachelor events, attractions, escape rooms.
8. fashion_boutiques = אופנה, תכשיטים ובוטיקים — Fashion stores, jewelry, bags, shoes, swimwear, local designers, boutiques, accessories.
9. parenting_family = הורות, ילדים ומשפחה — Baby products, kids activities, parenting coaches, sleep consultants, kindergartens, tutors, nannies, toys.
10. health_wellness = בריאות, טיפול ו-Wellness — Therapists, psychologists, physiotherapists, alternative medicine, dietitians, women's health, sleep, stress, acupuncture.

Return JSON:
{
  "category_id": "",
  "category_name_he": "",
  "confidence": 0.0,
  "reason": "",
  "secondary_category_id": "",
  "needs_user_confirmation": false
}`;

async function callGrokDirect(systemPrompt, userPrompt, temperature = 0.2) {
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

    const { businessDescription } = await req.json();
    if (!businessDescription) {
      return Response.json({ error: "businessDescription is required" }, { status: 400 });
    }

    const raw = await callGrokDirect(
      SYSTEM_PROMPT,
      `Business description:\n${businessDescription}`,
      0.2
    );

    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    // Validate category_id is in the allowed list
    const validIds = CATEGORIES.map(c => c.id);
    if (!validIds.includes(result.category_id)) {
      result.category_id = validIds[0];
      result.confidence = 0.5;
      result.needs_user_confirmation = true;
    }

    // Enforce needs_user_confirmation rule
    if (result.confidence < 0.75) {
      result.needs_user_confirmation = true;
    }

    // Ensure category_name_he is correct (never trust model for this)
    const cat = CATEGORIES.find(c => c.id === result.category_id);
    if (cat) result.category_name_he = cat.name_he;

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});