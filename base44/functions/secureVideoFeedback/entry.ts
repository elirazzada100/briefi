import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const FEEDBACK_LABELS = {
  5: "מעולה",
  4: "טוב",
  3: "סביר",
  2: "לא מספיק",
  1: "לא טוב",
};

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

async function requireOwnedVideoBrief(base44, userId, projectId, videoBriefId) {
  const ownedProject = await requireOwnedProject(base44, userId, projectId);
  if (ownedProject.error) {
    return ownedProject;
  }

  if (!videoBriefId) {
    return { error: "video_brief_id is required", status: 400 };
  }

  const briefs = await base44.asServiceRole.entities.VideoBrief.filter({ id: videoBriefId });
  const brief = briefs[0];

  if (!brief || !brief.project_id || brief.project_id !== ownedProject.project.id) {
    return { error: "Forbidden", status: 403 };
  }

  return { project: ownedProject.project, brief };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, project_id, video_brief_id, rating, comment } = body;

    if (action !== "submitVideoFeedback") {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    const owned = await requireOwnedVideoBrief(base44, user.id, project_id, video_brief_id);
    if (owned.error) {
      return Response.json({ error: owned.error }, { status: owned.status });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return Response.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }

    const label = FEEDBACK_LABELS[numericRating] || "";
    const feedback = await base44.asServiceRole.entities.UserBriefFeedback.create({
      project_id: owned.project.id,
      video_brief_id: owned.brief.id,
      user_id: user.id,
      owner_id: user.id,
      rating_label: label,
      video_feedback_score: numericRating,
      video_feedback_label: label,
      free_text_negative: typeof comment === "string" ? comment : "",
      video_feedback_created_at: new Date().toISOString(),
    });

    return Response.json({ success: true, feedback_id: feedback.id });
  } catch (error) {
    console.error("secureVideoFeedback error:", error?.message || error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
});
