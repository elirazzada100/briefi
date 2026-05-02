import test from "node:test";
import assert from "node:assert/strict";

import { OwnedProjectError } from "../grokBriefiFlow/ownership.js";
import { SecureBriefMutationError, runSecureBriefMutation } from "./secureBriefMutations.js";

function makeEntityApi(records) {
  const list = records.map((record) => ({ ...record }));
  let nextId = 1;

  return {
    list,
    async filter(filters = {}) {
      return list.filter((record) =>
        Object.entries(filters).every(([key, value]) => record[key] === value)
      );
    },
    async update(id, patch) {
      const index = list.findIndex((record) => record.id === id);
      if (index === -1) {
        throw new Error(`Record not found: ${id}`);
      }
      list[index] = { ...list[index], ...patch };
      return list[index];
    },
    async create(record) {
      const created = { id: record.id || `created-${nextId++}`, ...record };
      list.push(created);
      return created;
    },
    async delete(id) {
      const index = list.findIndex((record) => record.id === id);
      if (index === -1) {
        throw new Error(`Record not found: ${id}`);
      }
      list.splice(index, 1);
    },
  };
}

function makeBase44({
  projects = [],
  videoBriefs = [],
  branding = [],
} = {}) {
  return {
    asServiceRole: {
      entities: {
        Project: makeEntityApi(projects),
        VideoBrief: makeEntityApi(videoBriefs),
        UserBranding: makeEntityApi(branding),
      },
    },
  };
}

test("user A can read and update their own video brief", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a", completed_briefs_count: 1, status: "draft" }],
    videoBriefs: [{
      id: "brief-a",
      project_id: "project-a",
      hook: "old hook",
      brief_title: "Old title",
      adapted_brief: { hook: "old hook", brief_title: "Old title" },
      status: "draft",
    }],
  });

  const readResult = await runSecureBriefMutation(base44, "user-a", {
    action: "getOwnedVideoBrief",
    project_id: "project-a",
    video_brief_id: "brief-a",
  });
  assert.equal(readResult.video_brief.id, "brief-a");

  const updateResult = await runSecureBriefMutation(base44, "user-a", {
    action: "updateVideoBriefField",
    project_id: "project-a",
    video_brief_id: "brief-a",
    field: "hook",
    value: "new hook",
  });
  assert.equal(updateResult.video_brief.hook, "new hook");
  assert.equal(updateResult.video_brief.adapted_brief.hook, "new hook");
});

test("video brief creation requires an owned project", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a" }],
  });

  const ownCreate = await runSecureBriefMutation(base44, "user-a", {
    action: "saveFinalVideoBrief",
    project_id: "project-a",
    video_brief: {
      adapted_brief: {
        brief_title: "New brief",
        hook: "Hook",
      },
      status: "draft",
    },
  });

  assert.equal(ownCreate.video_brief.project_id, "project-a");
  assert.equal(ownCreate.video_brief.adapted_brief.brief_title, "New brief");

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-b", {
      action: "saveFinalVideoBrief",
      project_id: "project-a",
      video_brief: {
        adapted_brief: {
          brief_title: "Injected brief",
        },
      },
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});

test("user B cannot read or update user A video brief", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a" }],
    videoBriefs: [{ id: "brief-a", project_id: "project-a", adapted_brief: {} }],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-b", {
      action: "getOwnedVideoBrief",
      project_id: "project-a",
      video_brief_id: "brief-a",
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-b", {
      action: "updateVideoBriefField",
      project_id: "project-a",
      video_brief_id: "brief-a",
      field: "hook",
      value: "steal",
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});

test("user B cannot delete user A video brief", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a", completed_briefs_count: 1 }],
    videoBriefs: [{ id: "brief-a", project_id: "project-a", adapted_brief: {} }],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-b", {
      action: "deleteVideoFromBriefPackage",
      project_id: "project-a",
      video_brief_id: "brief-a",
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});

test("user B cannot reorder user A videos or inject external video ids", async () => {
  const base44 = makeBase44({
    projects: [
      { id: "project-a", owner_id: "user-a" },
      { id: "project-b", owner_id: "user-b" },
    ],
    videoBriefs: [
      { id: "brief-a1", project_id: "project-a" },
      { id: "brief-a2", project_id: "project-a" },
      { id: "brief-b1", project_id: "project-b" },
    ],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-b", {
      action: "reorderVideosInBriefPackage",
      project_id: "project-a",
      ordered_video_ids: ["brief-a2", "brief-a1"],
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-a", {
      action: "reorderVideosInBriefPackage",
      project_id: "project-a",
      ordered_video_ids: ["brief-a2", "brief-b1"],
    }),
    (error) => error instanceof SecureBriefMutationError && error.status === 403
  );
});

test("user B cannot mark user A project exported", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a", status: "in_progress" }],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-b", {
      action: "markProjectExported",
      project_id: "project-a",
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});

test("user B cannot update user A branding", async () => {
  const base44 = makeBase44({
    branding: [{ id: "branding-a", user_id: "user-a", display_name: "Owner" }],
  });

  const result = await runSecureBriefMutation(base44, "user-b", {
    action: "updateUserBranding",
    branding: { display_name: "User B" },
  });

  assert.equal(result.branding.user_id, "user-b");
  assert.equal(result.branding.display_name, "User B");
  assert.equal(base44.asServiceRole.entities.UserBranding.list.find((item) => item.id === "branding-a").display_name, "Owner");
});

test("ownerless project is rejected", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: null }],
    videoBriefs: [{ id: "brief-a", project_id: "project-a" }],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-a", {
      action: "getOwnedVideoBrief",
      project_id: "project-a",
      video_brief_id: "brief-a",
    }),
    (error) => error instanceof OwnedProjectError && error.status === 403
  );
});

test("missing and invalid ids are rejected", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a" }],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-a", {
      action: "markProjectExported",
      project_id: "",
    }),
    (error) => error instanceof OwnedProjectError && error.status === 400
  );

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-a", {
      action: "getOwnedVideoBrief",
      project_id: "project-a",
      video_brief_id: "missing-brief",
    }),
    (error) => error instanceof SecureBriefMutationError && error.status === 404
  );
});

test("forbidden video brief fields are rejected", async () => {
  const base44 = makeBase44({
    projects: [{ id: "project-a", owner_id: "user-a" }],
    videoBriefs: [{ id: "brief-a", project_id: "project-a", adapted_brief: {} }],
  });

  await assert.rejects(
    () => runSecureBriefMutation(base44, "user-a", {
      action: "updateVideoBriefField",
      project_id: "project-a",
      video_brief_id: "brief-a",
      field: "project_id",
      value: "project-b",
    }),
    (error) => error instanceof SecureBriefMutationError && error.status === 400
  );
});
