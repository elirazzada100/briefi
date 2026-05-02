import test from "node:test";
import assert from "node:assert/strict";

import { OwnedProjectError, requireOwnedProject } from "./ownership.js";

function makeBase44(projects) {
  return {
    asServiceRole: {
      entities: {
        Project: {
          async filter({ id }) {
            return projects.filter((project) => project.id === id);
          },
        },
      },
    },
  };
}

test("requireOwnedProject returns the owned project", async () => {
  const base44 = makeBase44([{ id: "project-1", owner_id: "user-a" }]);
  const project = await requireOwnedProject(base44, "user-a", "project-1");
  assert.equal(project.id, "project-1");
});

test("requireOwnedProject rejects missing project_id", async () => {
  const base44 = makeBase44([]);
  await assert.rejects(
    () => requireOwnedProject(base44, "user-a", ""),
    (error) => error instanceof OwnedProjectError && error.status === 400
  );
});

test("requireOwnedProject rejects invalid project_id", async () => {
  const base44 = makeBase44([]);
  await assert.rejects(
    () => requireOwnedProject(base44, "user-a", "missing-project"),
    (error) => error instanceof OwnedProjectError && error.status === 404
  );
});

test("requireOwnedProject rejects ownerless projects", async () => {
  const base44 = makeBase44([{ id: "project-1", owner_id: null }]);
  await assert.rejects(
    () => requireOwnedProject(base44, "user-a", "project-1"),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});

test("requireOwnedProject rejects cross-user access", async () => {
  const base44 = makeBase44([{ id: "project-1", owner_id: "user-a" }]);
  await assert.rejects(
    () => requireOwnedProject(base44, "user-b", "project-1"),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});
