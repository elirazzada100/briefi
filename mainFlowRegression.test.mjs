import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(filePath) {
  return fs.readFileSync(new URL(filePath, import.meta.url), "utf8");
}

test("app routes include protected client detail and active production flow", () => {
  const app = read("./src/App.jsx");

  assert.match(app, /path="\/project\/:projectId"/);
  assert.match(app, /path="\/project\/:projectId\/briefs"/);
  assert.match(app, /path="\/project\/:projectId\/creative-dna"/);
  assert.match(app, /path="\/project\/:projectId\/video-style"/);
  assert.match(app, /path="\/project\/:projectId\/grok-concepts"/);
  assert.match(app, /path="\/project\/:projectId\/grok-opening"/);
  assert.match(app, /path="\/project\/:projectId\/grok-cta"/);
  assert.match(app, /path="\/project\/:projectId\/final-brief"/);
  assert.match(app, /path="\/project\/:projectId\/brief-pack"/);
  assert.match(app, /path="\/project\/:projectId\/export"/);
});

test("dashboard client cards open the client detail route instead of jumping to a broken target", () => {
  const dashboard = read("./src/pages/Dashboard.jsx");

  assert.match(dashboard, /Link to=\{`\/project\/\$\{project\.id\}`\}/);
  assert.doesNotMatch(dashboard, /Link to=\{`\/project\/\$\{project\.id\}\/brief-pack`\}/);
});

test("client detail uses the owned project guard and loads project briefs for the selected client", () => {
  const clientDetail = read("./src/pages/ClientDetail.jsx");

  assert.match(clientDetail, /useProjectGuard\(projectId\)/);
  assert.match(clientDetail, /base44\.entities\.VideoBrief\.filter\(\{ project_id: project\.id \}/);
  assert.match(clientDetail, /navigate\(`\/project\/\$\{projectId\}\/final-brief`/);
  assert.match(clientDetail, /navigate\(`\/project\/\$\{projectId\}\/brief-pack`/);
  assert.match(clientDetail, /navigate\(`\/project\/\$\{projectId\}\/creative-dna`/);
});

test("main flow pages do not use dead routes and keep owned navigation intact", () => {
  const creativeDNA = read("./src/pages/CreativeDNA.jsx");
  const briefPack = read("./src/pages/BriefPack.jsx");

  assert.doesNotMatch(creativeDNA, /\/project\/\$\{projectId\}\/new/);
  assert.match(creativeDNA, /navigate\(`\/project\/\$\{projectId\}`\)/);
  assert.match(briefPack, /חזרה לסרטונים/);
  assert.match(briefPack, /navigate\(`\/project\/\$\{projectId\}`\)/);
});

test("pdf export still uses saved data only and does not call AI helpers", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.doesNotMatch(pdfExport, /briefiAI/);
  assert.doesNotMatch(pdfExport, /generateClientBriefSummary/);
  assert.doesNotMatch(pdfExport, /callGrok/);
  assert.match(pdfExport, /action: "getOwnedPDFExportData"/);
});
