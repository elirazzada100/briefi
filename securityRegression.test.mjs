import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { escapeHtml } from "./src/lib/escapeHtml.js";
import { isAdminUser as isClientAdminUser } from "./src/lib/admin.js";
import { AdminAccessError, isAdminUser as isServerAdminUser, requireAdminUser } from "./base44/functions/_shared/admin.js";

const repoRoot = "/Users/eliraz/Documents/Codex/2026-04-30/files-mentioned-by-the-user-briefi/briefi-audit";

function readLocal(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin helpers only allow admin users", async () => {
  assert.equal(isClientAdminUser({ role: "admin" }), true);
  assert.equal(isClientAdminUser({ role: "user" }), false);
  assert.equal(isServerAdminUser({ role: "admin" }), true);
  assert.equal(isServerAdminUser({ role: "user" }), false);

  assert.doesNotThrow(() => requireAdminUser({ role: "admin" }));
  assert.throws(
    () => requireAdminUser({ role: "user" }),
    (error) => error instanceof AdminAccessError && error.status === 403
  );
  assert.throws(
    () => requireAdminUser(null),
    (error) => error instanceof AdminAccessError && error.status === 401
  );
});

test("pdf escaping neutralizes raw html", async () => {
  const escaped = escapeHtml('<script>alert(1)</script>"quoted"&more');
  assert.equal(
    escaped,
    "&lt;script&gt;alert(1)&lt;/script&gt;&quot;quoted&quot;&amp;more"
  );
});

test("app routes disconnect legacy OpenAI flow and protect admin routes", async () => {
  const appSource = readLocal("src/App.jsx");

  assert.match(appSource, /import AdminRoute from '\.\/components\/AdminRoute'/);
  assert.match(appSource, /path="\/admin"/);
  assert.match(appSource, /<AdminRoute><AdminLearning \/><\/AdminRoute>/);
  assert.doesNotMatch(appSource, /path="\/project\/:projectId\/category"/);
  assert.doesNotMatch(appSource, /path="\/project\/:projectId\/concepts"/);
  assert.doesNotMatch(appSource, /path="\/project\/:projectId\/hooks"/);
  assert.doesNotMatch(appSource, /path="\/project\/:projectId\/body"/);
  assert.doesNotMatch(appSource, /path="\/project\/:projectId\/cta"/);
});

test("pdf export no longer calls AI helpers", async () => {
  const pdfSource = readLocal("src/pages/PDFExport.jsx");
  assert.doesNotMatch(pdfSource, /functions\.invoke\("briefiAI"/);
  assert.doesNotMatch(pdfSource, /generateClientBriefSummary/);
  assert.match(pdfSource, /escapeHtml/);
  assert.match(pdfSource, /getOwnedPDFExportData/);
});

test("callGrok is locked to admins", async () => {
  const callGrokSource = readLocal("base44/functions/callGrok/entry.ts");
  assert.match(callGrokSource, /requireAdminUser\(user\)/);
  assert.match(callGrokSource, /systemPrompt exceeds max length/);
  assert.match(callGrokSource, /userPrompt exceeds max length/);
});

test("legacy OpenAI functions are disabled in production", async () => {
  const briefiAISource = readLocal("base44/functions/briefiAI/entry.ts");
  const hookBankSource = readLocal("base44/functions/generateConceptsFromHookBank/entry.ts");

  assert.match(briefiAISource, /Deprecated: legacy OpenAI flow is disabled in production\./);
  assert.match(hookBankSource, /Deprecated: legacy OpenAI concept generation is disabled in production\./);
});
