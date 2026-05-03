import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function buildCurrentFlowRoutes(projectId, briefId) {
  return {
    dashboardEntry: `/project/${projectId}/brief-pack`,
    readyVideo: {
      pathname: `/project/${projectId}/final-brief`,
      state: { briefId },
    },
    briefPackage: `/project/${projectId}/brief-pack`,
    pdfExport: `/project/${projectId}/export`,
    backToClients: "/dashboard",
  };
}

test("Project remains the active client model and ClientDetail is not active", () => {
  const appSource = read("src/App.jsx");
  const dashboardSource = read("src/pages/Dashboard.jsx");

  assert.ok(appSource.includes('path="/dashboard"') || appSource.includes('path="/dashboard"'.replace(/"/g, '"')));
  assert.ok(dashboardSource.includes('base44.entities.Project.filter({ owner_id: user.id }'));
  assert.ok(!appSource.includes("ClientDetail"));
  assert.ok(!appSource.includes('/client/:clientId'));
  assert.equal(fileExists("src/pages/ClientDetail.jsx"), false);
});

test("active routes stay project-based and keep brief pack / final brief / export reachable", () => {
  const appSource = read("src/App.jsx");

  assert.ok(appSource.includes('path="/project/:projectId/brief-pack"'));
  assert.ok(appSource.includes('path="/project/:projectId/final-brief"'));
  assert.ok(appSource.includes('path="/project/:projectId/export"'));
  assert.ok(appSource.includes('path="/project/:projectId/grok-concepts"'));
  assert.ok(!appSource.includes('path="/project/:projectId" element='));
  assert.ok(!appSource.includes('path="/client/:clientId"'));
});

test("dashboard project cards navigate with projectId and not clientId", () => {
  const dashboardSource = read("src/pages/Dashboard.jsx");

  assert.ok(dashboardSource.includes('Link to={`/project/${project.id}/brief-pack`}'));
  assert.ok(!dashboardSource.includes("clientId"));
  assert.ok(!dashboardSource.includes("/client/"));
});

test("brief package ready video and PDF navigation preserve projectId and briefId", () => {
  const briefPackSource = read("src/pages/BriefPack.jsx");
  const finalBriefSource = read("src/pages/FinalBrief.jsx");
  const pdfExportSource = read("src/pages/PDFExport.jsx");

  assert.ok(briefPackSource.includes('navigate(`/project/${projectId}/final-brief`, { state: { briefId: brief.id } })'));
  assert.ok(briefPackSource.includes('navigate(`/project/${projectId}/export`)'));
  assert.ok(finalBriefSource.includes('navigate(`/project/${projectId}/brief-pack`)'));
  assert.ok(pdfExportSource.includes('navigate(`/project/${projectId}/brief-pack`)'));
  assert.ok(!finalBriefSource.includes('navigate("/dashboard")'));
});

test("mocked core flow keeps the same project and brief identifiers end to end", () => {
  const mockProject = { id: "proj_123", client_name: "Cafe Test" };
  const mockBriefs = [
    { id: "brief_1", video_order: 2, video_number: 2 },
    { id: "brief_2", video_order: 1, video_number: 1 },
    { id: "brief_3", video_order: 3, video_number: 3 },
  ];

  const sortedBriefs = [...mockBriefs].sort(
    (a, b) => (a.video_order ?? a.video_number ?? 0) - (b.video_order ?? b.video_number ?? 0),
  );
  const routes = buildCurrentFlowRoutes(mockProject.id, sortedBriefs[0].id);

  assert.equal(routes.dashboardEntry, "/project/proj_123/brief-pack");
  assert.equal(routes.readyVideo.pathname, "/project/proj_123/final-brief");
  assert.equal(routes.readyVideo.state.briefId, "brief_2");
  assert.equal(routes.briefPackage, "/project/proj_123/brief-pack");
  assert.equal(routes.pdfExport, "/project/proj_123/export");
  assert.equal(routes.backToClients, "/dashboard");
});

test("PDF export uses all briefs in preserved order and keeps short-video wording", () => {
  const pdfSource = read("src/pages/PDFExport.jsx");

  assert.ok(pdfSource.includes("setBriefs(b.sort("));
  assert.ok(pdfSource.includes("const briefsHTML = briefs.map((brief) =>"));
  assert.ok(pdfSource.includes("const clientBriefs = briefs.map((brief, idx) =>"));
  assert.ok(pdfSource.includes("if (count === 1) return \"סרטון קצר אחד\";"));
  assert.ok(pdfSource.includes("return `${count} סרטונים קצרים`;"));
  assert.ok(!pdfSource.includes("בריפים מוכנים"));
});

test("PDF export remains AI-free and does not use deprecated helper functions", () => {
  const pdfSource = read("src/pages/PDFExport.jsx");

  assert.ok(!pdfSource.includes("briefiAI"));
  assert.ok(!pdfSource.includes("generateClientBriefSummary"));
  assert.ok(!pdfSource.includes("callGrok"));
  assert.ok(!pdfSource.includes("OpenAI"));
  assert.ok(!pdfSource.includes('functions.invoke("callGrok")'));
});

test("shared loading components keep centered short copy and slow rotation", () => {
  const sharedLoader = read("src/components/shared/BriefiLoader.jsx");
  const sharedState = read("src/components/shared/LoadingState.jsx");
  const briefiState = read("src/components/briefi/LoadingState.jsx");

  for (const source of [sharedLoader, sharedState, briefiState]) {
    assert.ok(source.includes("max-w-[260px]"));
    assert.ok(source.includes("text-center"));
    assert.ok(source.includes("rotateMs = 3000"));
  }

  assert.ok(!sharedLoader.includes("ConceptBank"));
  assert.ok(!sharedLoader.includes("HookBank"));
  assert.ok(!sharedLoader.includes("OpenAI"));
  assert.ok(!sharedLoader.includes("retrieval"));
  assert.ok(!sharedLoader.includes("filtering"));
  assert.ok(!sharedLoader.includes("database"));
});

test("active flow remains independent from OpenAI and user-facing callGrok", () => {
  const files = [
    "src/pages/CreativeDNA.jsx",
    "src/pages/GrokConceptPicker.jsx",
    "src/pages/GrokBodyPicker.jsx",
    "src/pages/GrokOpeningPicker.jsx",
    "src/pages/GrokCTAPicker.jsx",
    "src/pages/FinalBrief.jsx",
    "src/pages/PDFExport.jsx",
    "base44/functions/grokBriefiFlow/entry.ts",
  ];

  for (const file of files) {
    const source = read(file);
    assert.ok(!source.includes("OPENAI_API_KEY"), `${file} should not require OPENAI_API_KEY`);
    assert.ok(!source.includes("npm:openai"), `${file} should not import OpenAI`);
    assert.ok(!source.includes('invoke("callGrok")'), `${file} should not call callGrok`);
    assert.ok(!source.includes("invoke('callGrok')"), `${file} should not call callGrok`);
  }
});
