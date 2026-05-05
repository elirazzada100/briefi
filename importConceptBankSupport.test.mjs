import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("importConceptBank supports explicit ugc source import from the repo file", () => {
  const source = read("base44/functions/importConceptBank/entry.ts");

  assert.ok(source.includes('const UGC_IMPORT_READY_PATH = new URL("../../data/conceptbank/briefi_ugc_conceptbank_1000_import_ready.csv", import.meta.url);'));
  assert.ok(source.includes('const CSV_SOURCES = {'));
  assert.ok(source.includes('ugc: {'));
  assert.ok(source.includes('type: "local"'));
  assert.ok(source.includes('body?.source || "default"'));
  assert.ok(source.includes('const sourceConfig = CSV_SOURCES[requestedSource];'));
  assert.ok(source.includes('csvText = await Deno.readTextFile(sourceConfig.path);'));
});

test("importConceptBank still keeps the default remote import path", () => {
  const source = read("base44/functions/importConceptBank/entry.ts");

  assert.ok(source.includes('default: {'));
  assert.ok(source.includes('type: "remote"'));
  assert.ok(source.includes('url: CSV_URL'));
  assert.ok(source.includes('const csvRes = await fetch(sourceConfig.url);'));
});
