import { AIFlowError, SAFE_AI_RETRY_MESSAGE } from "./guardrails.js";

const ACTIVE_STAGE_REQUESTS = new Map();
const USER_CALL_WINDOWS = new Map();

export const MAX_GENERATIONS_PER_HOUR = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function withStageLock(userId, projectId, stage, fn) {
  const lockKey = `${userId}:${projectId || "global"}:${stage}`;
  if (ACTIVE_STAGE_REQUESTS.has(lockKey)) {
    throw new AIFlowError(429, "Generation already in progress for this stage", {
      userMessage: SAFE_AI_RETRY_MESSAGE,
      code: "DUPLICATE_IN_FLIGHT_GENERATION",
    });
  }

  ACTIVE_STAGE_REQUESTS.set(lockKey, Date.now());
  try {
    return await fn();
  } finally {
    ACTIVE_STAGE_REQUESTS.delete(lockKey);
  }
}

export function enforceUserRateLimit(userId, stage) {
  const now = Date.now();
  const existing = USER_CALL_WINDOWS.get(userId) || [];
  const recent = existing.filter((entry) => now - entry.timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_GENERATIONS_PER_HOUR) {
    throw new AIFlowError(429, "AI rate limit exceeded", {
      userMessage: SAFE_AI_RETRY_MESSAGE,
      code: "AI_RATE_LIMIT_EXCEEDED",
    });
  }

  recent.push({ timestamp: now, stage });
  USER_CALL_WINDOWS.set(userId, recent);
  return recent.length;
}

export async function withTimeout(promiseFactory, timeoutMs, onTimeoutMessage = SAFE_AI_RETRY_MESSAGE) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort("timeout"), timeoutMs);

  try {
    return await promiseFactory(abortController.signal);
  } catch (error) {
    if (error?.name === "AbortError" || error === "timeout") {
      throw new AIFlowError(504, "AI request timeout", {
        userMessage: onTimeoutMessage,
        code: "AI_TIMEOUT",
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function logAiEvent(event) {
  console.info(JSON.stringify({
    type: "briefi_ai_event",
    timestamp: new Date().toISOString(),
    ...event,
  }));
}
