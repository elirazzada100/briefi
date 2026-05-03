import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FORBIDDEN_RESPONSE, isAdminUser, sanitizeCallGrokInput } from "./base44/functions/callGrok/guards.js";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin helper only allows admin role", () => {
  assert.equal(isAdminUser(null), false);
  assert.equal(isAdminUser({}), false);
  assert.equal(isAdminUser({ role: "member" }), false);
  assert.equal(isAdminUser({ role: "admin" }), true);
});

test("forbidden response is the required safe payload", () => {
  assert.deepEqual(FORBIDDEN_RESPONSE, {
    error: "FORBIDDEN",
    message: "אין הרשאה להשתמש בפעולה הזאת.",
  });
});

test("input validation rejects empty and oversized prompts", () => {
  assert.equal(sanitizeCallGrokInput({}).ok, false);
  assert.equal(sanitizeCallGrokInput({ userPrompt: "" }).ok, false);
  assert.equal(sanitizeCallGrokInput({ userPrompt: "x".repeat(12001) }).ok, false);
  assert.equal(sanitizeCallGrokInput({ systemPrompt: "x".repeat(4001), userPrompt: "ok" }).ok, false);
});

test("input validation clamps temperature safely", () => {
  const high = sanitizeCallGrokInput({ userPrompt: "hello", temperature: 2 });
  const low = sanitizeCallGrokInput({ userPrompt: "hello", temperature: -1 });
  const invalid = sanitizeCallGrokInput({ userPrompt: "hello", temperature: "oops" });

  assert.equal(high.ok, true);
  assert.equal(high.temperature, 1);
  assert.equal(low.temperature, 0);
  assert.equal(invalid.temperature, 0.7);
});

test("active product flow does not invoke callGrok", () => {
  const appFiles = [
    "src/pages/CreativeDNA.jsx",
    "src/pages/GrokConceptPicker.jsx",
    "src/pages/GrokBodyPicker.jsx",
    "src/pages/GrokOpeningPicker.jsx",
    "src/pages/GrokCTAPicker.jsx",
    "src/pages/FinalBrief.jsx",
    "src/pages/PDFExport.jsx",
    "base44/functions/grokBriefiFlow/entry.ts",
  ];

  for (const file of appFiles) {
    const source = read(file);
    assert.ok(!source.includes('invoke("callGrok")'), `${file} invokes callGrok`);
    assert.ok(!source.includes("invoke('callGrok')"), `${file} invokes callGrok`);
  }
});

test("callGrok entry enforces auth, admin gate, and output limits", () => {
  const source = read("base44/functions/callGrok/entry.ts");
  assert.ok(source.includes('return Response.json({ error: "UNAUTHORIZED" }, { status: 401 })'));
  assert.ok(source.includes("FORBIDDEN_RESPONSE"));
  assert.ok(source.includes("isAdminUser(user)"));
  assert.ok(source.includes("max_completion_tokens: MAX_COMPLETION_TOKENS"));
  assert.ok(!source.includes("OpenAI"));
});
