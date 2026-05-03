import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("grokBriefiFlow includes owned-project helper with strict missing/invalid/ownerless checks", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes("async function requireOwnedProject(base44, userId, projectId)"));
  assert.ok(source.includes('return { error: "project_id is required", status: 400 }'));
  assert.ok(source.includes('return { error: "Project not found", status: 404 }'));
  assert.ok(source.includes('if (!project.owner_id || project.owner_id !== userId)'));
  assert.ok(source.includes('return { error: "Forbidden", status: 403 }'));
});

test("project-scoped grok actions require owned project before project mutation", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('if (action === "generateCreativeDNA")'));
  assert.ok(source.includes('const ownedProjectResult = await requireOwnedProject(base44, user.id, pid);'));
  assert.ok(source.includes('await base44.asServiceRole.entities.Project.update(ownedProjectResult.project.id'));

  assert.ok(source.includes('if (action === "assembleFinalBrief")'));
  assert.ok(source.includes('const ownedProjectResult = await requireOwnedProject(base44, user.id, project_id);'));
  assert.ok(source.includes('const ownedProject = ownedProjectResult.project;'));
  assert.ok(source.includes('await base44.asServiceRole.entities.VideoBrief.filter({ project_id: ownedProject.id })') || source.includes('await base44.asServiceRole.entities.VideoBrief.filter({ project_id: ownedProject.id });'));
  assert.ok(source.includes('project_id: ownedProject.id'));
  assert.ok(source.includes('await base44.asServiceRole.entities.Project.update(ownedProject.id'));

  assert.ok(source.includes('if (action === "improveFinalBrief")'));
  assert.ok(source.includes('const ownedProjectResult = await requireOwnedProject(base44, user.id, project_id);'));
});
