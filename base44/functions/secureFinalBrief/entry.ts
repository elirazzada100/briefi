import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getOwnedProject(base44, userId, projectId) {
  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  const project = projects[0];
  if (!project || project.owner_id !== userId) return null;
  return project;
}

async function getOwnedBrief(base44, projectId, briefId) {
  const briefs = await base44.asServiceRole.entities.VideoBrief.filter({ id: briefId, project_id: projectId });
  return briefs[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, project_id, brief_id, patch, feedback } = await req.json();
    if (!project_id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const project = await getOwnedProject(base44, user.id, project_id);
    if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (action === "getOwnedVideoBrief") {
      if (!brief_id) return Response.json({ error: "Forbidden" }, { status: 403 });
      const brief = await getOwnedBrief(base44, project_id, brief_id);
      if (!brief) return Response.json({ error: "Forbidden" }, { status: 403 });
      return Response.json({ brief });
    }

    if (action === "updateOwnedVideoBrief") {
      if (!brief_id || !patch || typeof patch !== "object") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      const brief = await getOwnedBrief(base44, project_id, brief_id);
      if (!brief) return Response.json({ error: "Forbidden" }, { status: 403 });

      const allowedPatch = {};
      if (Object.prototype.hasOwnProperty.call(patch, "adapted_brief")) {
        allowedPatch.adapted_brief = patch.adapted_brief;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "status")) {
        allowedPatch.status = patch.status;
      }
      if (Object.keys(allowedPatch).length === 0) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const updated = await base44.asServiceRole.entities.VideoBrief.update(brief_id, allowedPatch);
      return Response.json({ brief: updated });
    }

    if (action === "submitOwnedVideoFeedback") {
      if (!brief_id || !feedback || typeof feedback !== "object") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      const brief = await getOwnedBrief(base44, project_id, brief_id);
      if (!brief) return Response.json({ error: "Forbidden" }, { status: 403 });

      const created = await base44.asServiceRole.entities.UserBriefFeedback.create({
        project_id,
        video_brief_id: brief_id,
        rating_label: feedback.rating_label || "",
        video_feedback_score: feedback.video_feedback_score ?? null,
        video_feedback_label: feedback.video_feedback_label || "",
        free_text_negative: feedback.free_text_negative || "",
        video_feedback_created_at: feedback.video_feedback_created_at || new Date().toISOString(),
      });
      return Response.json({ feedback: created });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
