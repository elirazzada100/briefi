import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin-only backend functions reject non-admin callers", () => {
  const importConceptBank = read("base44/functions/importConceptBank/entry.ts");
  const verifyConceptBankIntegrity = read("base44/functions/verifyConceptBankIntegrity/entry.ts");
  const verifyUGCConceptBankIntegrity = read("base44/functions/verifyUGCConceptBankIntegrity/entry.ts");
  const benchmarkAIProviders = read("base44/functions/benchmarkAIProviders/entry.ts");

  assert.ok(importConceptBank.includes("user.role !== 'admin'"));
  assert.ok(importConceptBank.includes("Forbidden: admin only"));

  assert.ok(verifyConceptBankIntegrity.includes("user.role !== 'admin'"));
  assert.ok(verifyConceptBankIntegrity.includes("Forbidden"));

  assert.ok(verifyUGCConceptBankIntegrity.includes("user.role !== 'admin'"));
  assert.ok(verifyUGCConceptBankIntegrity.includes("Forbidden: admin only"));

  assert.ok(benchmarkAIProviders.includes("user.role !== 'admin'"));
  assert.ok(benchmarkAIProviders.includes("Forbidden: admin only"));
});

test("active user flow files remain untouched by admin-only security scope", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const finalBrief = read("src/pages/FinalBrief.jsx");
  const briefPack = read("src/pages/BriefPack.jsx");
  const pdfExport = read("src/pages/PDFExport.jsx");
  const app = read("src/App.jsx");
  const dashboard = read("src/pages/Dashboard.jsx");

  assert.ok(grokFlow.includes("classifyWithOpenAI"));
  assert.ok(grokFlow.includes("selectConceptsWithOpenAI"));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("grok_polish_applied"));

  assert.ok(finalBrief.includes("base44.entities.VideoBrief.filter({ id: briefId })"));
  assert.ok(finalBrief.includes("base44.entities.VideoBrief.update(briefId, { adapted_brief: updated })"));
  assert.ok(finalBrief.includes("base44.entities.UserBriefFeedback.create({"));

  assert.ok(briefPack.includes("base44.entities.VideoBrief.delete(deleteTarget.id)"));
  assert.ok(briefPack.includes("base44.entities.VideoBrief.update(b.id, { video_order: i + 1 })"));

  assert.ok(pdfExport.includes("base44.entities.Project.update(projectId, { status: \"exported\" })"));

  assert.ok(app.includes('path="/project/:projectId/grok-concepts"'));
  assert.ok(!app.includes("benchmarkAIProviders"));
  assert.ok(!app.includes("ClientDetail"));

  assert.ok(dashboard.includes('base44.functions.invoke("deleteProject"'));
});

test("conceptbank contract, UGC inactivity, and provider split remain unchanged", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const benchmarkAIProviders = read("base44/functions/benchmarkAIProviders/entry.ts");

  [grokFlow, benchmarkAIProviders].forEach((source) => {
    assert.ok(source.includes("1000_Concepts_Briefi_10_display_clean"));
    assert.ok(!source.includes("1000_UGC_Briefi_10_display_clean"));
    assert.ok(!source.includes("briefi_ugc_conceptbank"));
  });

  assert.ok(grokFlow.includes('source_type: "concept_bank"'));
  assert.ok(grokFlow.includes("candidateIdSet"));
  assert.ok(grokFlow.includes('provider_log: { provider_used: "openai", step_name: "concept_bank_strict", success: true }'));
  assert.ok(grokFlow.includes('provider_used: "openai"'));
  assert.ok(grokFlow.includes('step_name: "final_brief"'));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("grok_polish_attempted"));
});
