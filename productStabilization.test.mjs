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
    assert.match(source, /max-w-\[220px\]/);
  });
});
