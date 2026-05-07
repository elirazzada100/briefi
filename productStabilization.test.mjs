import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(filePath) {
  return fs.readFileSync(new URL(filePath, import.meta.url), "utf8");
}

test("pdf export uses saved brief list for both export types and does not call AI", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(pdfExport, /const clientBriefs = briefs\.map\(/);
  assert.match(pdfExport, /const briefsHTML = briefs\.map\(/);
  assert.doesNotMatch(pdfExport, /briefiAI/);
  assert.doesNotMatch(pdfExport, /generateClientBriefSummary/);
  assert.doesNotMatch(pdfExport, /functions\.invoke\("briefiAI"/);
});

test("pdf wording uses short video labels instead of brief count wording", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(pdfExport, /formatShortVideosLabel/);
  assert.doesNotMatch(pdfExport, /בריפים מוכנים/);
});

test("pdf loading copy is package specific", () => {
  const pdfExport = read("./src/pages/PDFExport.jsx");

  assert.match(pdfExport, /מסדרים את הבריף/);
  assert.match(pdfExport, /אורזים את הסרטונים/);
  assert.doesNotMatch(pdfExport, /מכינים את הסרטון/);
});

test("loading components use centered narrow text", () => {
  const sharedLoader = read("./src/components/shared/BriefiLoader.jsx");
  const sharedLoading = read("./src/components/shared/LoadingState.jsx");
  const briefiLoading = read("./src/components/briefi/LoadingState.jsx");

  [sharedLoader, sharedLoading, briefiLoading].forEach((source) => {
    assert.match(source, /text-center/);
    assert.match(source, /max-w-\[260px\]/);
  });
});

test("published flow safety boundaries remain intact", () => {
  const app = read("./src/App.jsx");
  const dashboard = read("./src/pages/Dashboard.jsx");
  const grokFlow = read("./base44/functions/grokBriefiFlow/entry.ts");

  assert.match(app, /project\/:projectId\/grok-concepts/);
  assert.match(app, /project\/:projectId\/grok-opening/);
  assert.match(app, /project\/:projectId\/grok-cta/);
  assert.doesNotMatch(app, /ClientDetail/);
  assert.match(dashboard, /Project\.filter/);
  assert.match(grokFlow, /1000_Concepts_Briefi_10_display_clean/);
  assert.doesNotMatch(grokFlow, /1000_UGC_Briefi_10_display_clean/);
  assert.doesNotMatch(grokFlow, /briefi_ugc_conceptbank/);
});
