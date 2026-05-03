import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import { FORBIDDEN_RESPONSE, isAdminUser, sanitizeCallGrokInput } from "./guards.js";

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-4.20";
const MAX_COMPLETION_TOKENS = 1200;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      console.warn("callGrok forbidden", {
        function: "callGrok",
        userId: user.id,
        reason: "non_admin",
      });
      return Response.json(FORBIDDEN_RESPONSE, { status: 403 });
    }

    const input = sanitizeCallGrokInput(await req.json());
    if (!input.ok) {
      console.warn("callGrok invalid input", {
        function: "callGrok",
        userId: user.id,
        error: input.body.error,
      });
      return Response.json(input.body, { status: input.status });
    }

    if (!XAI_API_KEY) {
      console.error("callGrok upstream unavailable", {
        function: "callGrok",
        userId: user.id,
        reason: "missing_api_key",
      });
      return Response.json(
        { error: "UPSTREAM_UNAVAILABLE", message: "הפעולה לא זמינה כרגע." },
        { status: 503 },
      );
    }

    const messages = [];
    if (input.systemPrompt) {
      messages.push({ role: "system", content: input.systemPrompt });
    }
    messages.push({ role: "user", content: input.userPrompt });

    const apiRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages,
        temperature: input.temperature,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
      }),
    });

    if (!apiRes.ok) {
      console.error("callGrok upstream error", {
        function: "callGrok",
        userId: user.id,
        status: apiRes.status,
        systemPromptLength: input.systemPromptLength,
        userPromptLength: input.userPromptLength,
      });
      return Response.json(
        { error: "UPSTREAM_ERROR", message: "הפעולה לא הושלמה. נסו שוב בעוד רגע." },
        { status: 502 },
      );
    }

    const data = await apiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (content === undefined) {
      console.error("callGrok empty response", {
        function: "callGrok",
        userId: user.id,
        systemPromptLength: input.systemPromptLength,
        userPromptLength: input.userPromptLength,
      });
      return Response.json(
        { error: "UPSTREAM_ERROR", message: "הפעולה לא הושלמה. נסו שוב בעוד רגע." },
        { status: 502 },
      );
    }

    console.info("callGrok success", {
      function: "callGrok",
      userId: user.id,
      systemPromptLength: input.systemPromptLength,
      userPromptLength: input.userPromptLength,
    });

    return Response.json({ content, model: data.model, usage: data.usage });
  } catch (error) {
    console.error("callGrok failure", {
      function: "callGrok",
      errorType: error?.name || "Error",
      message: error?.message || "unknown_error",
    });
    return Response.json(
      { error: "INTERNAL_ERROR", message: "הפעולה לא הושלמה. נסו שוב בעוד רגע." },
      { status: 500 },
    );
  }
});
