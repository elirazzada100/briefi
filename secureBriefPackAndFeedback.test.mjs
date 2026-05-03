import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("secureBriefPack delete verifies parent project ownership", () => {
  const source = read("base44/functions/secureBriefPack/entry.ts");

  assert.ok(source.includes("async function requireOwnedProject(base44, userId, projectId)"));
  assert.ok(source.includes("async function requireOwnedVideoBrief(base44, userId, videoBriefId, projectId)"));
  assert.ok(source.includes('if (!project.owner_id || project.owner_id !== userId)'));
  assert.ok(source.includes("if (projectId && brief.project_id !== projectId)"));
  assert.ok(source.includes('if (action === "deleteOwnedVideoBrief")'));
  assert.ok(source.includes("await base44.asServiceRole.entities.VideoBrief.delete(owned.brief.id)"));
});

test("secureBriefPack reorder rejects external and duplicate IDs", () => {
  const source = read("base44/functions/secureBriefPack/entry.ts");

  assert.ok(source.includes('if (action === "reorderOwnedVideoBriefs")'));
  assert.ok(source.includes("new Set(ordered_video_ids).size !== ordered_video_ids.length"));
  assert.ok(source.includes("ordered_video_ids.length !== projectBriefIds.length"));
  assert.ok(source.includes("if (!projectBriefIdSet.has(id))"));
  assert.ok(source.includes('return Response.json({ error: "All video IDs must belong to the owned project" }, { status: 400 })'));
});

test("BriefPack uses secureBriefPack instead of direct delete and reorder updates", () => {
  const source = read("src/pages/BriefPack.jsx");

  assert.ok(source.includes('action: "deleteOwnedVideoBrief"'));
  assert.ok(source.includes('action: "reorderOwnedVideoBriefs"'));
  assert.ok(!source.includes("base44.entities.VideoBrief.delete("));
  assert.ok(!source.includes("base44.entities.VideoBrief.update("));
  assert.ok(!source.includes("base44.entities.Project.update("));
});

test("secureVideoFeedback verifies owned project and matching video", () => {
  const source = read("base44/functions/secureVideoFeedback/entry.ts");

  assert.ok(source.includes("async function requireOwnedProject(base44, userId, projectId)"));
  assert.ok(source.includes("async function requireOwnedVideoBrief(base44, userId, projectId, videoBriefId)"));
  assert.ok(source.includes('if (!project.owner_id || project.owner_id !== userId)'));
  assert.ok(source.includes("if (!brief || !brief.project_id || brief.project_id !== ownedProject.project.id)"));
  assert.ok(source.includes('if (action !== "submitVideoFeedback")'));
});

test("secureVideoFeedback sets user identity server-side and ignores spoofing", () => {
  const source = read("base44/functions/secureVideoFeedback/entry.ts");

  assert.ok(source.includes("user_id: user.id"));
  assert.ok(source.includes("owner_id: user.id"));
  assert.ok(!source.includes("body.user_id"));
  assert.ok(!source.includes("body.owner_id"));
});

test("FinalBrief uses secureVideoFeedback instead of direct feedback create", () => {
  const source = read("src/pages/FinalBrief.jsx");

  assert.ok(source.includes('action: "submitVideoFeedback"'));
  assert.ok(!source.includes("base44.entities.UserBriefFeedback.create("));
});
