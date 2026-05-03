import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function requireOwnedProject(base44, userId, projectId) {
  if (!projectId) {
    return { error: "project_id is required", status: 400 };
  }

  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  const project = projects[0];

  if (!project) {
    return { error: "Project not found", status: 404 };
  }

  if (!project.owner_id || project.owner_id !== userId) {
    return { error: "Forbidden", status: 403 };
  }

  return { project };
}

async function requireOwnedVideoBrief(base44, userId, videoBriefId, projectId) {
  if (!videoBriefId) {
    return { error: "video_brief_id is required", status: 400 };
  }

  const briefs = await base44.asServiceRole.entities.VideoBrief.filter({ id: videoBriefId });
  const brief = briefs[0];

  if (!brief) {
    return { error: "VideoBrief not found", status: 404 };
  }

  if (!brief.project_id) {
    return { error: "Forbidden", status: 403 };
  }

  if (projectId && brief.project_id !== projectId) {
    return { error: "Forbidden", status: 403 };
  }

  const ownedProject = await requireOwnedProject(base44, userId, brief.project_id);
  if (ownedProject.error) {
    return ownedProject;
  }

  return { brief, project: ownedProject.project };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, project_id, video_brief_id, ordered_video_ids } = body;

    if (action === "deleteOwnedVideoBrief") {
      const owned = await requireOwnedVideoBrief(base44, user.id, video_brief_id, project_id);
      if (owned.error) {
        return Response.json({ error: owned.error }, { status: owned.status });
      }

      await base44.asServiceRole.entities.VideoBrief.delete(owned.brief.id);
      const remainingBriefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id: owned.project.id });
      await base44.asServiceRole.entities.Project.update(owned.project.id, {
        completed_briefs_count: remainingBriefs.length,
      });

      return Response.json({ success: true, deleted_id: owned.brief.id, completed_briefs_count: remainingBriefs.length });
    }

    if (action === "reorderOwnedVideoBriefs") {
      const ownedProject = await requireOwnedProject(base44, user.id, project_id);
      if (ownedProject.error) {
        return Response.json({ error: ownedProject.error }, { status: ownedProject.status });
      }

      if (!Array.isArray(ordered_video_ids) || ordered_video_ids.length === 0) {
        return Response.json({ error: "ordered_video_ids is required" }, { status: 400 });
      }

      const projectBriefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id: ownedProject.project.id });
      const projectBriefIds = projectBriefs.map((brief) => brief.id);
      const projectBriefIdSet = new Set(projectBriefIds);

      if (new Set(ordered_video_ids).size !== ordered_video_ids.length) {
        return Response.json({ error: "Duplicate video IDs are not allowed" }, { status: 400 });
      }

      if (ordered_video_ids.length !== projectBriefIds.length) {
        return Response.json({ error: "ordered_video_ids must include every project video exactly once" }, { status: 400 });
      }

      for (const id of ordered_video_ids) {
        if (!projectBriefIdSet.has(id)) {
          return Response.json({ error: "All video IDs must belong to the owned project" }, { status: 400 });
        }
      }

      await Promise.all(
        ordered_video_ids.map((id, index) =>
          base44.asServiceRole.entities.VideoBrief.update(id, { video_order: index + 1 })
        )
      );

      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("secureBriefPack error:", error?.message || error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
});
