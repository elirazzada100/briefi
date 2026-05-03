export const FORBIDDEN_RESPONSE = {
  error: "FORBIDDEN",
  message: "אין הרשאה להשתמש בפעולה הזאת.",
};

const MAX_SYSTEM_PROMPT_LENGTH = 4000;
const MAX_USER_PROMPT_LENGTH = 12000;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isAdminUser(user) {
  return Boolean(user?.role === "admin");
}

export function sanitizeCallGrokInput(payload = {}) {
  const systemPrompt = normalizeString(payload.systemPrompt);
  const userPrompt = normalizeString(payload.userPrompt);

  if (!systemPrompt && !userPrompt) {
    return { ok: false, status: 400, body: { error: "INVALID_INPUT", message: "נדרש פרומפט תקין." } };
  }

  if (!userPrompt) {
    return { ok: false, status: 400, body: { error: "INVALID_INPUT", message: "נדרש פרומפט תקין." } };
  }

  if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    return { ok: false, status: 400, body: { error: "INVALID_INPUT", message: "הבקשה ארוכה מדי." } };
  }

  if (userPrompt.length > MAX_USER_PROMPT_LENGTH) {
    return { ok: false, status: 400, body: { error: "INVALID_INPUT", message: "הבקשה ארוכה מדי." } };
  }

  const rawTemperature = Number.isFinite(payload.temperature) ? payload.temperature : Number(payload.temperature);
  const temperature = Number.isFinite(rawTemperature)
    ? Math.min(1, Math.max(0, rawTemperature))
    : 0.7;

  return {
    ok: true,
    systemPrompt,
    userPrompt,
    temperature,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
  };
}
