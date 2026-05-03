import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("secureFinalBrief verifies VideoBrief parent project ownership", () => {
  const source = read("base44/functions/secureFinalBrief/entry.ts");

  assert.ok(source.includes("async function requireOwnedVideoBrief(base44, userId, videoBriefId, projectId)"));
  assert.ok(source.includes('return { error: "video_brief_id is required", status: 400 }'));
  assert.ok(source.includes('return { error: "VideoBrief not found", status: 404 }'));
  assert.ok(source.includes("if (!brief.project_id)"));
  assert.ok(source.includes("if (projectId && brief.project_id !== projectId)"));
  assert.ok(source.includes("if (!project || !project.owner_id || project.owner_id !== userId)"));
});

test("secureFinalBrief rejects forbidden fields and updates only owned briefs", () => {
  const source = read("base44/functions/secureFinalBrief/entry.ts");

  assert.ok(source.includes('const FORBIDDEN_FIELDS = new Set(['));
  assert.ok(source.includes('"project_id"'));
  assert.ok(source.includes('"owner_id"'));
  assert.ok(source.includes('"user_id"'));
  assert.ok(source.includes('return { error: "Forbidden field update", status: 400 }'));
  assert.ok(source.includes('if (action === "updateOwnedVideoBrief")'));
  assert.ok(source.includes("await base44.asServiceRole.entities.VideoBrief.update(owned.brief.id, sanitized.sanitized)"));
});

test("FinalBrief uses secureFinalBrief instead of direct VideoBrief update", () => {
  const source = read("src/pages/FinalBrief.jsx");

  assert.ok(source.includes('action: "getOwnedVideoBrief"'));
  assert.ok(source.includes('action: "updateOwnedVideoBrief"'));
  assert.ok(!source.includes("base44.entities.VideoBrief.update("));
});
