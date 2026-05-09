import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin-only functions are locked down for non-admin callers", () => {
  const callGrok = read("base44/functions/callGrok/entry.ts");
  const importConceptBank = read("base44/functions/importConceptBank/entry.ts");
  const verifyConceptBank = read("base44/functions/verifyConceptBankIntegrity/entry.ts");
  const benchmark = read("base44/functions/benchmarkAIProviders/entry.ts");

  assert.ok(callGrok.includes('user.role !== "admin"'));
  assert.ok(callGrok.includes('Forbidden: admin only'));
  assert.ok(importConceptBank.includes("user.role !== 'admin'"));
  assert.ok(verifyConceptBank.includes("user.role !== 'admin'"));
  assert.ok(benchmark.includes("user.role !== 'admin'"));
});

test("grokBriefiFlow enforces owned project checks before project writes", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("async function getOwnedProject"));
  assert.ok(source.includes('if (!ownedProject) return Response.json({ error: "Forbidden" }, { status: 403 });'));
  assert.ok(source.includes('if (action === "generateCreativeDNA")'));
  assert.ok(source.includes('if (action === "assembleFinalBrief")'));
  assert.ok(source.includes('if (action === "improveFinalBrief")'));
});

test("deleteProject blocks cross-user deletes without leaking project existence", () => {
  const source = read("base44/functions/deleteProject/entry.ts");

  assert.ok(source.includes('if (!project || project.owner_id !== user.id)'));
  assert.ok(source.includes('return Response.json({ error: "Forbidden" }, { status: 403 });'));
  assert.ok(!source.includes("Project not found"));
});

test("secureFinalBrief wraps owned brief reads, updates, and feedback writes", () => {
  const source = read("base44/functions/secureFinalBrief/entry.ts");
  const finalBriefPage = read("src/pages/FinalBrief.jsx");

  assert.ok(source.includes('action === "getOwnedVideoBrief"'));
  assert.ok(source.includes('action === "updateOwnedVideoBrief"'));
  assert.ok(source.includes('action === "submitOwnedVideoFeedback"'));
  assert.ok(source.includes("project.owner_id !== userId"));
  assert.ok(source.includes('return Response.json({ error: "Forbidden" }, { status: 403 });'));

  assert.ok(finalBriefPage.includes('base44.functions.invoke("secureFinalBrief"'));
  assert.ok(finalBriefPage.includes('action: "getOwnedVideoBrief"'));
  assert.ok(finalBriefPage.includes('action: "updateOwnedVideoBrief"'));
  assert.ok(finalBriefPage.includes('action: "submitOwnedVideoFeedback"'));
  assert.ok(!finalBriefPage.includes("base44.entities.VideoBrief.update("));
  assert.ok(!finalBriefPage.includes("base44.entities.UserBriefFeedback.create("));
});

test("secureBriefPack wraps owned brief-pack reads, deletes, reorder, and export updates", () => {
  const source = read("base44/functions/secureBriefPack/entry.ts");
  const briefPackPage = read("src/pages/BriefPack.jsx");
  const pdfExportPage = read("src/pages/PDFExport.jsx");

  assert.ok(source.includes('action === "getOwnedBriefPack"'));
  assert.ok(source.includes('action === "deleteOwnedVideoBrief"'));
  assert.ok(source.includes('action === "reorderOwnedVideoBriefs"'));
  assert.ok(source.includes('action === "markProjectExported"'));
  assert.ok(source.includes("project.owner_id !== userId"));
  assert.ok(source.includes("existingIds.length !== requestedIds.length"));

  assert.ok(briefPackPage.includes('base44.functions.invoke("secureBriefPack"'));
  assert.ok(briefPackPage.includes('action: "getOwnedBriefPack"'));
  assert.ok(briefPackPage.includes('action: "deleteOwnedVideoBrief"'));
  assert.ok(briefPackPage.includes('action: "reorderOwnedVideoBriefs"'));
  assert.ok(!briefPackPage.includes("base44.entities.VideoBrief.delete("));
  assert.ok(!briefPackPage.includes("base44.entities.VideoBrief.update("));

  assert.ok(pdfExportPage.includes('base44.functions.invoke("secureBriefPack"'));
  assert.ok(pdfExportPage.includes('action: "getOwnedBriefPack"'));
  assert.ok(pdfExportPage.includes('action: "markProjectExported"'));
  assert.ok(!pdfExportPage.includes("base44.entities.Project.update(projectId, { status: \"exported\" })"));
});

test("current conceptbank contract and hybrid final brief state remain unchanged", () => {
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(grokFlow.includes('const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean"'));
  assert.ok(grokFlow.includes("source_batch: ACTIVE_CONCEPT_SOURCE_BATCH"));
  assert.ok(grokFlow.includes("industry_order: industryOrder"));
  assert.ok(grokFlow.includes("user_facing_video_style: videoStyle"));
  assert.ok(grokFlow.includes("candidateIdSet"));
  assert.ok(grokFlow.includes('source_type: "concept_bank"'));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("grok_polish_attempted"));
  assert.ok(grokFlow.includes("grok_polish_applied"));
  assert.ok(!grokFlow.includes("1000_UGC_Briefi_10_display_clean"));
  assert.ok(!grokFlow.includes("briefi_ugc_conceptbank"));
});
