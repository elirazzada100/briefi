import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-3";

const CATEGORIES = [
  {
    id: "food_restaurants",
    industry_order: 1,
    name_he: "מסעדנות ואוכל",
    aliases: ["מסעדנות ואוכל", "אוכל", "מסעדה", "food_restaurants"],
    keywords: ["מסעדה", "אוכל", "בית קפה", "קפה", "שווארמה", "פיצה", "המבורגר", "מאפייה", "קונדיטוריה", "קייטרינג", "משלוחים", "תפריט", "מנה", "קינוח", "בשר", "סושי", "מסעדנות", "פלאפל", "חומוס"],
  },
  {
    id: "beauty_aesthetics",
    industry_order: 2,
    name_he: "יופי ואסתטיקה",
    aliases: ["יופי ואסתטיקה", "יופי", "אסתטיקה", "beauty_aesthetics"],
    keywords: ["יופי", "איפור", "שיער", "לק", "ציפורניים", "קוסמטיקה", "אסתטיקה", "בוטוקס", "חומצה", "גבות", "ריסים", "מספרה", "ספא", "עור", "קוסמטיקאית", "לייזר", "שעווה"],
  },
  {
    id: "fitness_nutrition",
    industry_order: 3,
    name_he: "פיטנס ותזונה",
    aliases: ["פיטנס ותזונה", "כושר", "תזונה", "fitness_nutrition"],
    keywords: ["כושר", "אימון", "מאמן", "חדר כושר", "פילאטיס", "יוגה", "תזונה", "דיאטה", "חיטוב", "שרירים", "ספורט", "בריאות גוף", "מאמנת", "קרוספיט", "ריצה"],
  },
  {
    id: "coaches_consultants",
    industry_order: 4,
    name_he: "מאמנים / יועצים / נותני ידע",
    aliases: ["מאמנים / יועצים / נותני ידע", "מאמנים, יועצים ונותני ידע", "יועצים", "נותני ידע", "coaches_consultants"],
    keywords: ["יועץ", "ייעוץ", "מנטור", "קורס", "סדנה", "הרצאה", "ליווי", "מומחה", "הדרכה", "לימוד", "עסקי", "פיננסי", "שיווק", "קריירה", "קואצ'ר", "מלווה", "קורסים"],
  },
  {
    id: "local_services",
    industry_order: 5,
    name_he: "שירותים מקומיים ובעלי מקצוע",
    aliases: ["שירותים מקומיים ובעלי מקצוע", "עסקים מקומיים ושירותים לבית", "בעלי מקצוע", "local_services"],
    keywords: ["אינסטלטור", "חשמלאי", "מנעולן", "ניקיון", "הדברה", "מוסך", "תיקון", "שירות", "טכנאי", "הובלות", "התקנה", "בעל מקצוע", "שיפוצניק", "מזגן", "מכונאי"],
  },
  {
    id: "real_estate_interiors",
    industry_order: 6,
    name_he: "נדל״ן / עיצוב / שיפוצים",
    aliases: ["נדל״ן / עיצוב / שיפוצים", "נדל״ן, עיצוב פנים ושיפוצים", "נדלן", "real_estate_interiors"],
    keywords: ["נדלן", "נדל\"ן", "דירה", "בית", "נכס", "מתווך", "אדריכלות", "עיצוב פנים", "שיפוץ", "מטבח", "ריהוט", "קבלן", "בנייה", "משכנתא", "דירות"],
  },
  {
    id: "fashion_boutiques",
    industry_order: 7,
    name_he: "אופנה / לייפסטייל / מוצרים",
    aliases: ["אופנה / לייפסטייל / מוצרים", "אופנה, תכשיטים ובוטיקים", "לייפסטייל", "מוצרים", "fashion_boutiques"],
    keywords: ["אופנה", "בגדים", "תיק", "תיקים", "נעליים", "תכשיט", "מוצר", "חנות", "מותג", "קולקציה", "אקססורי", "לייפסטייל", "מתנות", "בקבוק", "מארז", "צעצועים", "צעצוע", "משחקים", "משחק"],
  },
  {
    id: "events_nightlife",
    industry_order: 8,
    name_he: "בילוי / ברים / חיי לילה",
    aliases: ["בילוי / ברים / חיי לילה", "אירועים, לילה וחוויות", "חיי לילה", "events_nightlife"],
    keywords: ["בר", "פאב", "קוקטייל", "מסיבה", "הופעה", "בילוי", "חיי לילה", "בירה", "ערב", "מוזיקה", "מועדון", "dj", "די ג'יי", "מסיבות"],
  },
  {
    id: "parenting_family",
    industry_order: 9,
    name_he: "חינוך / ילדים / חוגים",
    aliases: ["חינוך / ילדים / חוגים", "הורות, ילדים ומשפחה", "ילדים", "parenting_family"],
    keywords: ["ילדים", "הורים", "גן", "בית ספר", "חוג", "משחקים", "צעצועים", "למידה", "קייטנה", "פעילות לילדים", "משפחה", "תינוקות", "תינוק", "חינוך", "שיעורים", "לגו", "לימוד לילדים"],
  },
  {
    id: "health_wellness",
    industry_order: 10,
    name_he: "בריאות / טיפולים / קליניקות",
    aliases: ["בריאות / טיפולים / קליניקות", "בריאות, טיפול ו-Wellness", "בריאות", "קליניקות", "health_wellness"],
    keywords: ["רופא", "קליניקה", "טיפול", "פיזיותרפיה", "פסיכולוג", "רפואה", "כאב", "שיניים", "בריאות", "מטפל", "טיפול רגשי", "רפואה משלימה", "דיקור", "פצע", "שיקום"],
  },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));
const CATEGORY_BY_ORDER = new Map(CATEGORIES.map((category) => [category.industry_order, category]));

function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/[״"'`]/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/[^\p{L}\p{N}\s/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_BY_ALIAS = new Map(
  CATEGORIES.flatMap((category) => [
    [normalizeText(category.id), category],
    [String(category.industry_order), category],
    [normalizeText(category.name_he), category],
    ...category.aliases.map((alias) => [normalizeText(alias), category]),
  ])
);

function canonicalizeCategory(candidate) {
  if (candidate === null || candidate === undefined) return null;

  if (typeof candidate === "number" && Number.isInteger(candidate)) {
    return CATEGORY_BY_ORDER.get(candidate) || null;
  }

  const normalized = normalizeText(candidate);
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    return CATEGORY_BY_ORDER.get(Number(normalized)) || null;
  }

  return CATEGORY_BY_ALIAS.get(normalized) || null;
}

function normalizeClassificationResult(raw) {
  if (!raw || typeof raw !== "object") return null;

  const candidates = [
    raw.industry_order,
    raw.category_id,
    raw.category_name_he,
    raw.industry_name,
    raw.category,
    raw.category_name,
    raw.id,
    raw.name,
  ];

  for (const candidate of candidates) {
    const canonical = canonicalizeCategory(candidate);
    if (canonical) {
      return {
        category_id: canonical.id,
        category_name_he: canonical.name_he,
        industry_order: canonical.industry_order,
        industry_name: canonical.name_he,
        confidence: typeof raw.confidence === "number" ? raw.confidence : null,
        reason: raw.reason || "",
        secondary_category_id: raw.secondary_category_id || "",
        needs_user_confirmation: typeof raw.needs_user_confirmation === "boolean" ? raw.needs_user_confirmation : false,
      };
    }
  }

  return null;
}

function classifyByKeywords(text) {
  const haystack = normalizeText(text);
  if (!haystack) return null;

  const scores = CATEGORIES.map((category) => {
    let score = 0;
    for (const keyword of category.keywords) {
      if (haystack.includes(normalizeText(keyword))) {
        score += keyword.length > 4 ? 3 : 2;
      }
    }
    return { category, score };
  });

  if (haystack.includes("צעצוע") || haystack.includes("צעצועים") || haystack.includes("לגו")) {
    const parenting = scores.find((entry) => entry.category.id === "parenting_family");
    if (parenting) parenting.score += 5;
  }

  if (haystack.includes("תיק") || haystack.includes("תיקים") || haystack.includes("מותג") || haystack.includes("קולקציה")) {
    const fashion = scores.find((entry) => entry.category.id === "fashion_boutiques");
    if (fashion) fashion.score += 4;
  }

  if (haystack.includes("קליניקה") || haystack.includes("טיפול") || haystack.includes("רפואה") || haystack.includes("מטפל")) {
    const health = scores.find((entry) => entry.category.id === "health_wellness");
    if (health) health.score += 4;
  }

  if (haystack.includes("אסתט") || haystack.includes("בוטוקס") || haystack.includes("גבות") || haystack.includes("ריסים")) {
    const beauty = scores.find((entry) => entry.category.id === "beauty_aesthetics");
    if (beauty) beauty.score += 4;
  }

  if (haystack.includes("בר") && (haystack.includes("קוקטייל") || haystack.includes("בירה") || haystack.includes("מוזיקה") || haystack.includes("מועדון"))) {
    const nightlife = scores.find((entry) => entry.category.id === "events_nightlife");
    if (nightlife) nightlife.score += 4;
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best || best.score <= 0) return null;

  return {
    category_id: best.category.id,
    category_name_he: best.category.name_he,
    industry_order: best.category.industry_order,
    industry_name: best.category.name_he,
    confidence: 0.61,
    reason: "keyword_fallback",
    secondary_category_id: "",
    needs_user_confirmation: false,
    classification_method: "keyword_fallback",
  };
}

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

const SYSTEM_PROMPT = `You are Briefi Category Classifier.

Your job is to classify an Israeli business into exactly ONE of Briefi's 10 fixed business categories.

Do not invent new categories.
Do not generate content ideas.
Do not write marketing copy.
Only classify the business.

Return ONLY valid JSON. No markdown. No explanations outside the JSON.

Available categories:
1. food_restaurants = מסעדנות ואוכל
2. beauty_aesthetics = יופי ואסתטיקה
3. fitness_nutrition = פיטנס ותזונה
4. coaches_consultants = מאמנים / יועצים / נותני ידע
5. local_services = שירותים מקומיים ובעלי מקצוע
6. real_estate_interiors = נדל״ן / עיצוב / שיפוצים
7. fashion_boutiques = אופנה / לייפסטייל / מוצרים
8. events_nightlife = בילוי / ברים / חיי לילה
9. parenting_family = חינוך / ילדים / חוגים
10. health_wellness = בריאות / טיפולים / קליניקות

IMPORTANT RULES:
- Toys / toy stores / games shops / children's gifts / kids activities / classes -> prefer parenting_family unless the wording is clearly about general retail lifestyle products.
- Bags / backpacks / jewelry / boutique / fashion brand -> prefer fashion_boutiques.
- Beauty clinics with aesthetic wording -> prefer beauty_aesthetics.
- Medical / clinic / treatment wording -> prefer health_wellness.

Return JSON:
{
  "category_id": "",
  "category_name_he": "",
  "industry_order": 0,
  "industry_name": "",
  "confidence": 0.0,
  "reason": "",
  "secondary_category_id": "",
  "needs_user_confirmation": false
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { businessDescription } = await req.json();
    if (!businessDescription) {
      return Response.json({ error: "businessDescription is required" }, { status: 400 });
    }

    const fallbackResult = classifyByKeywords(businessDescription);

    if (!XAI_API_KEY) {
      if (fallbackResult) {
        return Response.json(fallbackResult);
      }
      return Response.json({
        error: "CLASSIFICATION_UNDETERMINED",
        message: "לא הצלחנו לזהות את קטגוריית העסק. נסו להוסיף עוד כמה מילים על סוג העסק.",
      }, { status: 422 });
    }

    try {
      const raw = await callGrokDirect(
        SYSTEM_PROMPT,
        `Business description:\n${businessDescription}`,
        0.2
      );

      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeClassificationResult(parsed);

      if (normalized) {
        return Response.json({
          ...normalized,
          classification_method: "grok",
        });
      }
    } catch (_error) {
      // Fall through to deterministic keyword classification below.
    }

    if (fallbackResult) {
      return Response.json(fallbackResult);
    }

    return Response.json({
      error: "CLASSIFICATION_UNDETERMINED",
      message: "לא הצלחנו לזהות את קטגוריית העסק. נסו להוסיף עוד כמה מילים על סוג העסק.",
    }, { status: 422 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
