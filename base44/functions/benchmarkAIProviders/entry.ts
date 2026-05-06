import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-4.20";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean";
const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"];

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    concepts: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          concept_title: { type: "string" },
          adapted_reason: { type: "string" },
        },
        required: ["id", "concept_title", "adapted_reason"],
      },
    },
  },
  required: ["concepts"],
};

function parseJSON(raw: string) {
  return JSON.parse(
    raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
  );
}

function buildPrompts(
  businessDescription: string,
  industryOrder: number,
  userFacingVideoStyle: string,
  candidateList: string,
  candidateCount: number
) {
  const systemPrompt = `You are Briefi ConceptBank benchmark selector.

You receive exactly ${candidateCount} ConceptBank candidates for industry_order=${industryOrder} and style="${userFacingVideoStyle}".

Rules:
1. Select EXACTLY 4 concepts from the provided candidate pool.
2. You may adapt the explanation to the business, but the source concept must stay from the pool.
3. Do NOT invent concepts.
4. Every returned id MUST exactly match one candidate id from the pool.
5. Return valid JSON only.
6. No markdown. No explanation outside JSON.

Return:
{"concepts":[{"id":"exact-candidate-id","concept_title":"string","adapted_reason":"string"}]}`;

  const userPrompt = `Business description:
${businessDescription}

industry_order: ${industryOrder}
user_facing_video_style: ${userFacingVideoStyle}

Candidate pool — choose exactly 4 and use only these ids:
${candidateList}`;

  return { systemPrompt, userPrompt };
}

async function callGrok(systemPrompt: string, userPrompt: string) {
  const start = Date.now();
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
      temperature: 0.2,
    }),
  });
  const durationMs = Date.now() - start;

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    throw new Error(`xAI API error: ${apiRes.status} — ${errText}`);
  }

  const data = await apiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Grok");

  return { content, durationMs, usage: data?.usage || null, model: data?.model || XAI_MODEL };
}

async function callOpenAI(systemPrompt: string, userPrompt: string) {
  const start = Date.now();
  const apiRes = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "briefi_concept_selection",
          strict: true,
          schema: JSON_SCHEMA,
        },
      },
    }),
  });
  const durationMs = Date.now() - start;

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    throw new Error(`OpenAI API error: ${apiRes.status} — ${errText}`);
  }

  const data = await apiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return { content, durationMs, usage: data?.usage || null, model: data?.model || OPENAI_MODEL };
}

function validateSelection(rawParsed: any, candidateIdSet: Set<string>) {
  const concepts = Array.isArray(rawParsed?.concepts) ? rawParsed.concepts : [];
  const invalidIds = concepts
    .map((concept: any) => concept?.id)
    .filter((id: string) => !id || !candidateIdSet.has(id));

  return {
    parse_validation_success: concepts.length === 4 && invalidIds.length === 0,
    returned_ids_count: concepts.length,
    all_ids_in_candidate_pool: invalidIds.length === 0,
    invalid_ids: invalidIds,
    concepts,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const {
      industry_order,
      user_facing_video_style,
      business_description,
      provider = "both",
    } = await req.json();

    const industryOrder = Number(industry_order);
    const videoStyle = user_facing_video_style;

    if (!industryOrder || industryOrder < 1 || industryOrder > 10) {
      return Response.json({ error: "industry_order must be a number between 1 and 10" }, { status: 400 });
    }

    if (!BANK_STYLES.includes(videoStyle)) {
      return Response.json({ error: "user_facing_video_style is not supported for ConceptBank benchmark" }, { status: 400 });
    }

    if (!business_description || !String(business_description).trim()) {
      return Response.json({ error: "business_description is required" }, { status: 400 });
    }

    if (!["grok", "openai", "both"].includes(provider)) {
      return Response.json({ error: "provider must be one of: grok, openai, both" }, { status: 400 });
    }

    const candidates = await base44.asServiceRole.entities.ConceptBank.filter(
      {
        is_active: true,
        source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
        industry_order: industryOrder,
        user_facing_video_style: videoStyle,
      },
      "concept_number_in_section",
      20
    );

    if (candidates.length < 4) {
      return Response.json({
        error: "CONCEPT_RETRIEVAL_FAILED",
        message: "לא נמצאו קונספטים מתאימים בבנק הקונספטים. צריך לבדוק שהבנק נטען ושיש התאמה בין קטגוריה לסגנון.",
        candidate_count: candidates.length,
        retrieval_query: {
          is_active: true,
          source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
          industry_order: industryOrder,
          user_facing_video_style: videoStyle,
        },
      }, { status: 422 });
    }

    const candidatePool = candidates.map((candidate: any) => ({
      id: candidate.id,
      concept_title: candidate.concept_title,
      concept_raw_text: candidate.concept_raw_text,
    }));
    const candidateIdSet = new Set(candidatePool.map((candidate: any) => candidate.id));
    const candidateList = candidatePool
      .map((candidate: any, index: number) =>
        `[${index + 1}] ID: ${candidate.id}\nTitle: ${candidate.concept_title}\nText: ${candidate.concept_raw_text}`
      )
      .join("\n---\n");

    const { systemPrompt, userPrompt } = buildPrompts(
      String(business_description).trim(),
      industryOrder,
      videoStyle,
      candidateList,
      candidatePool.length
    );

    const results: Record<string, any> = {};

    if (provider === "grok" || provider === "both") {
      if (!XAI_API_KEY) {
        results.grok = {
          available: false,
          missing_env_var: "XAI_API_KEY",
        };
      } else {
        const totalStart = Date.now();
        try {
          const callResult = await callGrok(systemPrompt, userPrompt);
          const parsed = parseJSON(callResult.content);
          const validation = validateSelection(parsed, candidateIdSet);

          results.grok = {
            available: true,
            total_duration_ms: Date.now() - totalStart,
            model_call_duration_ms: callResult.durationMs,
            parse_validation_success: validation.parse_validation_success,
            returned_ids_count: validation.returned_ids_count,
            all_ids_in_candidate_pool: validation.all_ids_in_candidate_pool,
            invalid_ids: validation.invalid_ids,
            output_length_chars: callResult.content.length,
            usage: callResult.usage,
            model: callResult.model,
            concepts: validation.concepts,
          };
        } catch (error) {
          results.grok = {
            available: true,
            total_duration_ms: Date.now() - totalStart,
            parse_validation_success: false,
            returned_ids_count: 0,
            all_ids_in_candidate_pool: false,
            error_message: error.message,
          };
        }
      }
    }

    if (provider === "openai" || provider === "both") {
      if (!OPENAI_API_KEY) {
        results.openai = {
          available: false,
          missing_env_var: "OPENAI_API_KEY",
        };
      } else {
        const totalStart = Date.now();
        try {
          const callResult = await callOpenAI(systemPrompt, userPrompt);
          const parsed = parseJSON(callResult.content);
          const validation = validateSelection(parsed, candidateIdSet);

          results.openai = {
            available: true,
            total_duration_ms: Date.now() - totalStart,
            model_call_duration_ms: callResult.durationMs,
            parse_validation_success: validation.parse_validation_success,
            returned_ids_count: validation.returned_ids_count,
            all_ids_in_candidate_pool: validation.all_ids_in_candidate_pool,
            invalid_ids: validation.invalid_ids,
            output_length_chars: callResult.content.length,
            usage: callResult.usage,
            model: callResult.model,
            concepts: validation.concepts,
          };
        } catch (error) {
          results.openai = {
            available: true,
            total_duration_ms: Date.now() - totalStart,
            parse_validation_success: false,
            returned_ids_count: 0,
            all_ids_in_candidate_pool: false,
            error_message: error.message,
          };
        }
      }
    }

    return Response.json({
      benchmark_function: "benchmarkAIProviders",
      provider_requested: provider,
      retrieval_query: {
        is_active: true,
        source_batch: ACTIVE_CONCEPT_SOURCE_BATCH,
        industry_order: industryOrder,
        user_facing_video_style: videoStyle,
      },
      candidate_count: candidatePool.length,
      candidate_pool: candidatePool,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
