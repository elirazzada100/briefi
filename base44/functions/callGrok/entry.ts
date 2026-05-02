import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { AdminAccessError, requireAdminUser } from "../_shared/admin.js";

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const XAI_BASE_URL = Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
const XAI_MODEL = Deno.env.get("XAI_MODEL") || "grok-4.20";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdminUser(user);

    if (!XAI_API_KEY) {
      return Response.json({ error: "XAI_API_KEY is not set" }, { status: 500 });
    }

    const { systemPrompt, userPrompt, temperature = 0.7 } = await req.json();

    if (!userPrompt) {
      return Response.json({ error: "userPrompt is required" }, { status: 400 });
    }

    if (systemPrompt && systemPrompt.length > 4000) {
      return Response.json({ error: "systemPrompt exceeds max length" }, { status: 400 });
    }

    if (userPrompt.length > 12000) {
      return Response.json({ error: "userPrompt exceeds max length" }, { status: 400 });
    }

    if (typeof temperature !== "number" || temperature < 0 || temperature > 1) {
      return Response.json({ error: "temperature must be between 0 and 1" }, { status: 400 });
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const apiRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages,
        temperature,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return Response.json({ error: `xAI API error: ${apiRes.status}`, details: errText }, { status: 502 });
    }

    const data = await apiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (content === undefined) {
      return Response.json({ error: "Unexpected response format from xAI" }, { status: 502 });
    }

    return Response.json({ content, model: data.model, usage: data.usage });

  } catch (error) {
    if (error instanceof AdminAccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});
