import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getOwnedProject(base44, userId, projectId) {
  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  const project = projects[0];
  if (!project || project.owner_id !== userId) return null;
  return project;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, project_id, brief_id, ordered_brief_ids } = await req.json();
    if (!project_id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const project = await getOwnedProject(base44, user.id, project_id);
    if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (action === "getOwnedBriefPack") {
      const briefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id });
      return Response.json({ project, briefs });
    }

    if (action === "deleteOwnedVideoBrief") {
      if (!brief_id) return Response.json({ error: "Forbidden" }, { status: 403 });
      const briefs = await base44.asServiceRole.entities.VideoBrief.filter({ id: brief_id, project_id });
      const brief = briefs[0];
      if (!brief) return Response.json({ error: "Forbidden" }, { status: 403 });

      await base44.asServiceRole.entities.VideoBrief.delete(brief_id);
      const remaining = await base44.asServiceRole.entities.VideoBrief.filter({ project_id });
      await base44.asServiceRole.entities.Project.update(project_id, {
        completed_briefs_count: remaining.length,
      });
      return Response.json({ success: true, remaining_count: remaining.length });
    }

    if (action === "reorderOwnedVideoBriefs") {
      if (!Array.isArray(ordered_brief_ids) || ordered_brief_ids.length === 0) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      const briefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id });
      const existingIds = briefs.map(brief => brief.id).sort();
      const requestedIds = [...ordered_brief_ids].sort();
      if (existingIds.length !== requestedIds.length || existingIds.some((id, idx) => id !== requestedIds[idx])) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      await Promise.all(
        ordered_brief_ids.map((id, index) =>
          base44.asServiceRole.entities.VideoBrief.update(id, { video_order: index + 1 })
        )
      );
      return Response.json({ success: true });
    }

    if (action === "markProjectExported") {
      await base44.asServiceRole.entities.Project.update(project_id, { status: "exported" });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
