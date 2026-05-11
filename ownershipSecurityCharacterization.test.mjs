import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin and debug function inventory is explicit and protected", () => {
  const functionsDir = path.join(repoRoot, "base44/functions");
  const functionNames = fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  [
    "importConceptBank",
    "verifyConceptBankIntegrity",
    "verifyUGCConceptBankIntegrity",
    "benchmarkAIProviders",
    "verifyUXSpeedAndTrendyCopy",
  ].forEach((name) => assert.ok(functionNames.includes(name), `Expected function directory ${name}`));

  const importConceptBank = read("base44/functions/importConceptBank/entry.ts");
  const verifyConceptBankIntegrity = read("base44/functions/verifyConceptBankIntegrity/entry.ts");
  const verifyUGCConceptBankIntegrity = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");
  const benchmarkAIProviders = read("base44/functions/benchmarkAIProviders/entry.ts");
  const verifyUXSpeedAndTrendyCopy = read("base44/functions/verifyUXSpeedAndTrendyCopy/entry.ts");

  assert.ok(importConceptBank.includes("user.role !== 'admin'"));
  assert.ok(verifyConceptBankIntegrity.includes("user.role !== 'admin'"));
  assert.ok(verifyUGCConceptBankIntegrity.includes("user.role !== 'admin'"));
  assert.ok(benchmarkAIProviders.includes("user.role !== 'admin'"));
  assert.ok(verifyUXSpeedAndTrendyCopy.includes("user.role !== 'admin'"));
});

test("grokBriefiFlow service-role persistence risks are characterized without changing runtime", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes('if (action === "generateCreativeDNA") {'));
  assert.ok(grokFlow.includes("await base44.asServiceRole.entities.Project.update(pid, {"));

  assert.ok(grokFlow.includes('if (action === "assembleFinalBrief") {'));
  assert.ok(grokFlow.includes("savedBrief = await base44.asServiceRole.entities.VideoBrief.create({"));
  assert.ok(grokFlow.includes("await base44.asServiceRole.entities.Project.update(project_id, {"));

  assert.ok(grokFlow.includes("const { action, project_id, business, selectedConcept, selectedOpening, selectedBody, selectedCTA, selectedVideoStyle, businessAnalysis, specialFocus } = body;"));
});

test("frontend ownership assumptions are characterized as page checks plus RLS-dependent reads", () => {
  const finalBrief = read("src/pages/FinalBrief.jsx");
  const briefPack = read("src/pages/BriefPack.jsx");
  const pdfExport = read("src/pages/PDFExport.jsx");
  const projects = read("src/pages/Projects.jsx");
  const projectGuard = read("src/hooks/useProjectGuard.js");

  assert.ok(finalBrief.includes("useProjectGuard(projectId)"));
  assert.ok(finalBrief.includes("base44.entities.VideoBrief.filter({ id: briefId })"));
  assert.ok(finalBrief.includes("base44.entities.VideoBrief.update(briefId, { adapted_brief: updated })"));

  assert.ok(briefPack.includes("base44.entities.Project.filter({ id: projectId }).then(r => r[0])"));
  assert.ok(briefPack.includes("if (!p || p.owner_id !== user.id) {"));

  assert.ok(pdfExport.includes("base44.entities.Project.filter({ id: projectId }).then(r => r[0])"));
  assert.ok(pdfExport.includes("if (!p || p.owner_id !== user.id) {"));

  assert.ok(projects.includes('queryFn: () => base44.entities.Project.list("-created_date", 50)'));

  assert.ok(projectGuard.includes("const projects = await base44.entities.Project.filter({ id: projectId });"));
  assert.ok(projectGuard.includes("if (!p || (p.owner_id && p.owner_id !== me.id)) {"));
});

test("provider and admin error surfaces are characterized as potentially too detailed", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const verifyConceptBankIntegrity = read("base44/functions/verifyConceptBankIntegrity/entry.ts");
  const benchmarkAIProviders = read("base44/functions/benchmarkAIProviders/entry.ts");
  const importConceptBank = read("base44/functions/importConceptBank/entry.ts");
  const verifyUGCConceptBankIntegrity = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");

  assert.ok(grokFlow.includes("throw new Error(`xAI API error: ${apiRes.status} — ${errText}`)"));
  assert.ok(grokFlow.includes("throw new Error(`OpenAI API error: ${apiRes.status} — ${errText}`)"));
  assert.ok(grokFlow.includes("return Response.json({ error: `OpenAI error: ${apiRes.status}`, message: \"הבנייה נכשלה. נסו שוב.\", details: errText }, { status: 502 });"));
  assert.ok(grokFlow.includes("return Response.json({ error: error.message }, { status: 500 });"));

  assert.ok(verifyConceptBankIntegrity.includes("return Response.json({ error: error.message, stack: error.stack }, { status: 500 });"));
  assert.ok(benchmarkAIProviders.includes("return Response.json({ error: error.message }, { status: 500 });"));
  assert.ok(importConceptBank.includes("return Response.json({ error: error.message }, { status: 500 });"));
  assert.ok(verifyUGCConceptBankIntegrity.includes("return Response.json({ error: error.message }, { status: 500 });"));
});

test("deleteProject is already backend ownership-guarded and remains the smallest next hardening target", () => {
  const deleteProject = read("base44/functions/deleteProject/entry.ts");

  assert.ok(deleteProject.includes("const user = await base44.auth.me();"));
  assert.ok(deleteProject.includes("if (!user) return Response.json({ error: \"Unauthorized\" }, { status: 401 });"));
  assert.ok(deleteProject.includes("const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });"));
  assert.ok(deleteProject.includes("if (project.owner_id !== user.id) return Response.json({ error: \"אין לך הרשאה למחוק את הפרויקט הזה.\" }, { status: 403 });"));
  assert.ok(deleteProject.includes("await base44.asServiceRole.entities.Project.delete(project_id);"));
});

test("published product invariants stay visible while ownership risks are characterized", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const specialFocus = read("src/pages/SpecialFocus.jsx");
  const finalBrief = read("src/pages/FinalBrief.jsx");

  assert.ok(grokFlow.includes('const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean"'));
  assert.ok(grokFlow.includes('const UGC_CONCEPT_SOURCE_BATCH = "1000_UGC_Briefi_10_display_clean_v2"'));
  assert.ok(grokFlow.includes("function resolveStylePolicy(selectedStyle)"));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("grok_polish_attempted"));
  assert.ok(grokFlow.includes("function sanitizeFinalBriefUserFacingFields(finalBrief)"));
  assert.ok(grokFlow.includes("async function classifyWithOpenAI"));
  assert.ok(grokFlow.includes("await callWithFallback(CTA_GEN_SYSTEM"));
  assert.ok(specialFocus.includes("function normalizeSpecialFocus(rawValue)"));
  assert.ok(finalBrief.includes('action: "improveFinalBrief"'));
});

test.todo("future ownership guard: generateCreativeDNA rejects foreign project_id");
test.todo("future ownership guard: assembleFinalBrief rejects foreign project_id");
test.todo("future ownership guard: VideoBrief save requires project.owner_id === authenticated user");
