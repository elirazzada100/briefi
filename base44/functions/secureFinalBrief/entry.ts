import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const ALLOWED_FIELDS = new Set([
  "brief_title",
  "video_concept",
  "hook",
  "script_text",
  "shot_structure",
  "cta",
  "caption_suggestion",
  "production_notes",
  "visual_must_haves",
  "risk_notes",
  "script_format",
  "text_overlays",
  "adapted_brief",
  "status",
  "feedback",
]);

const FORBIDDEN_FIELDS = new Set([
  "id",
  "project_id",
  "owner_id",
  "user_id",
  "created_by",
  "created_date",
]);

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

  const projects = await base44.asServiceRole.entities.Project.filter({ id: brief.project_id });
  const project = projects[0];

  if (!project || !project.owner_id || project.owner_id !== userId) {
    return { error: "Forbidden", status: 403 };
  }

  return { brief, project };
}

function sanitizeUpdates(updates = {}) {
  const sanitized = {};

  for (const [field, value] of Object.entries(updates)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      return { error: "Forbidden field update", status: 400 };
    }

    if (!ALLOWED_FIELDS.has(field)) {
      return { error: "Field is not allowed", status: 400 };
    }

    sanitized[field] = value;
  }

  return { sanitized };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, project_id, video_brief_id, brief_id, updates } = body;
    const resolvedBriefId = video_brief_id || brief_id;

    if (action === "getOwnedVideoBrief") {
      const owned = await requireOwnedVideoBrief(base44, user.id, resolvedBriefId, project_id);
      if (owned.error) {
        return Response.json({ error: owned.error }, { status: owned.status });
      }

      return Response.json({ brief: owned.brief });
    }

    if (action === "updateOwnedVideoBrief") {
      const owned = await requireOwnedVideoBrief(base44, user.id, resolvedBriefId, project_id);
      if (owned.error) {
        return Response.json({ error: owned.error }, { status: owned.status });
      }

      const sanitized = sanitizeUpdates(updates || {});
      if (sanitized.error) {
        return Response.json({ error: sanitized.error }, { status: sanitized.status });
      }

      const updated = await base44.asServiceRole.entities.VideoBrief.update(owned.brief.id, sanitized.sanitized);
      return Response.json({ brief: updated });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("secureFinalBrief error:", error?.message || error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
});
