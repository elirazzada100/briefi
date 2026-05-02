import { OwnedProjectError, requireOwnedProject } from "../grokBriefiFlow/ownership.js";

export class SecureBriefMutationError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "SecureBriefMutationError";
    this.status = status;
  }
}

const FORBIDDEN_VIDEO_FIELDS = new Set([
  "id",
  "project_id",
  "owner_id",
  "created_by",
  "created_date",
  "source_batch",
  "user_id",
]);

const ALLOWED_VIDEO_FIELD_HANDLERS = {
  hook: (value, existing) => mirrorAdaptedBrief(existing, { hook: value }, { hook: value }),
  body_structure: (value, existing) => mirrorAdaptedBrief(existing, { shot_structure: value }, { shot_structure: value }),
  cta: (value, existing) => mirrorAdaptedBrief(existing, { cta: value }, { cta: value }),
  script_text: (value, existing) => mirrorAdaptedBrief(existing, { script_text: value }, { script_text: value }),
  caption_suggestion: (value, existing) => mirrorAdaptedBrief(existing, { caption_suggestion: value }, { caption_suggestion: value }),
  shooting_notes: (value, existing) => mirrorAdaptedBrief(existing, { production_notes: value }, { production_notes: value }),
  status: (value) => ({ status: value }),
  title: (value, existing) => mirrorAdaptedBrief(existing, { brief_title: value }, { brief_title: value }),
  final_summary: (value, existing) => mirrorAdaptedBrief(existing, {}, { final_summary: value }),
  feedback: (value, existing) => mirrorAdaptedBrief(existing, {}, { feedback: value }),
  order_index: (value) => ({ video_order: value }),
};

const SAFE_VIDEO_BRIEF_TOP_LEVEL_FIELDS = [
  "video_number",
  "video_order",
  "video_style",
  "category",
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
  "idea_tags",
  "script_format",
  "selected_hook",
  "selected_body",
  "selected_cta",
  "final_brief",
  "adapted_brief",
  "status",
];

const SAFE_BRANDING_FIELDS = [
  "display_name",
  "business_name",
  "logo_url",
  "brand_color",
  "email",
  "phone",
  "website",
];

function mirrorAdaptedBrief(existingBrief, topLevel, adaptedFields) {
  const adaptedBrief = { ...(existingBrief?.adapted_brief || {}) };
  Object.assign(adaptedBrief, adaptedFields);
  return {
    ...topLevel,
    adapted_brief: adaptedBrief,
  };
}

function sanitizeObject(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SecureBriefMutationError(400, `${fieldName} must be an object`);
  }
  return value;
}

function pickFields(source, allowedFields) {
  return allowedFields.reduce((acc, field) => {
    if (source[field] !== undefined) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
}

async function getEntityById(entityApi, entityName, id, idFieldName) {
  if (!id) {
    throw new SecureBriefMutationError(400, `${idFieldName} is required`);
  }

  const records = await entityApi.filter({ id });
  const record = records[0];
  if (!record) {
    throw new SecureBriefMutationError(404, `${entityName} not found`);
  }

  return record;
}

export async function requireOwnedVideoBrief(base44, userId, videoBriefId, expectedProjectId) {
  const videoBrief = await getEntityById(
    base44.asServiceRole.entities.VideoBrief,
    "VideoBrief",
    videoBriefId,
    "video_brief_id"
  );

  if (!videoBrief.project_id) {
    throw new SecureBriefMutationError(403, "Forbidden: video brief is not attached to a project");
  }

  if (expectedProjectId && videoBrief.project_id !== expectedProjectId) {
    throw new SecureBriefMutationError(403, "Forbidden: video brief does not belong to the requested project");
  }

  const project = await requireOwnedProject(base44, userId, videoBrief.project_id);
  return { videoBrief, project };
}

function buildVideoBriefPayload(input) {
  const payload = pickFields(input, SAFE_VIDEO_BRIEF_TOP_LEVEL_FIELDS);
  const adaptedBrief = input.adapted_brief;

  if (adaptedBrief !== undefined) {
    sanitizeObject(adaptedBrief, "adapted_brief");
    payload.adapted_brief = adaptedBrief;
  }

  const adapted = payload.adapted_brief || {};
  const mirrors = {
    brief_title: input.brief_title ?? adapted.brief_title,
    video_concept: input.video_concept ?? adapted.video_concept,
    hook: input.hook ?? adapted.hook,
    script_text: input.script_text ?? adapted.script_text,
    shot_structure: input.shot_structure ?? adapted.shot_structure,
    cta: input.cta ?? adapted.cta,
    caption_suggestion: input.caption_suggestion ?? adapted.caption_suggestion ?? adapted.video_description,
    production_notes: input.production_notes ?? adapted.production_notes,
    visual_must_haves: input.visual_must_haves ?? adapted.visual_must_haves,
    script_format: input.script_format ?? adapted.script_format,
    risk_notes: input.risk_notes ?? adapted.why_it_works,
  };

  Object.entries(mirrors).forEach(([key, value]) => {
    if (value !== undefined) {
      payload[key] = value;
    }
  });

  return payload;
}

async function handleGetOwnedVideoBrief(base44, userId, body) {
  const { video_brief_id, project_id } = body;
  const { videoBrief } = await requireOwnedVideoBrief(base44, userId, video_brief_id, project_id);
  return { video_brief: videoBrief };
}

async function handleUpdateVideoBriefField(base44, userId, body) {
  const { video_brief_id, project_id, field, value } = body;
  if (!field) {
    throw new SecureBriefMutationError(400, "field is required");
  }
  if (FORBIDDEN_VIDEO_FIELDS.has(field) || !ALLOWED_VIDEO_FIELD_HANDLERS[field]) {
    throw new SecureBriefMutationError(400, `Field "${field}" is not allowed`);
  }

  const { videoBrief } = await requireOwnedVideoBrief(base44, userId, video_brief_id, project_id);
  const payload = ALLOWED_VIDEO_FIELD_HANDLERS[field](value, videoBrief);
  const updated = await base44.asServiceRole.entities.VideoBrief.update(videoBrief.id, payload);
  return { video_brief: updated };
}

async function handleSaveFinalVideoBrief(base44, userId, body) {
  const { project_id, video_brief_id } = body;
  const project = await requireOwnedProject(base44, userId, project_id);

  const videoBriefInput = sanitizeObject(body.video_brief || {}, "video_brief");
  if (videoBriefInput.project_id !== undefined || videoBriefInput.id !== undefined || videoBriefInput.user_id !== undefined) {
    // Ignore client ownership identifiers entirely and rebuild from verified project below.
    delete videoBriefInput.project_id;
    delete videoBriefInput.id;
    delete videoBriefInput.user_id;
  }

  const payload = buildVideoBriefPayload(videoBriefInput);

  if (video_brief_id) {
    const { videoBrief } = await requireOwnedVideoBrief(base44, userId, video_brief_id, project.id);
    const updated = await base44.asServiceRole.entities.VideoBrief.update(videoBrief.id, payload);
    return { video_brief: updated };
  }

  const created = await base44.asServiceRole.entities.VideoBrief.create({
    ...payload,
    project_id: project.id,
  });

  return { video_brief: created };
}

async function handleDeleteVideoFromBriefPackage(base44, userId, body) {
  const { video_brief_id, project_id } = body;
  const { videoBrief, project } = await requireOwnedVideoBrief(base44, userId, video_brief_id, project_id);
  await base44.asServiceRole.entities.VideoBrief.delete(videoBrief.id);

  const remainingVideoBriefs = await base44.asServiceRole.entities.VideoBrief.filter({ project_id: project.id });
  const updatedProject = await base44.asServiceRole.entities.Project.update(project.id, {
    completed_briefs_count: remainingVideoBriefs.length,
  });

  return {
    success: true,
    deleted_video_brief_id: videoBrief.id,
    remaining_count: remainingVideoBriefs.length,
    project: updatedProject,
  };
}

async function handleReorderVideosInBriefPackage(base44, userId, body) {
  const { project_id, ordered_video_ids } = body;
  if (!Array.isArray(ordered_video_ids) || ordered_video_ids.length === 0) {
    throw new SecureBriefMutationError(400, "ordered_video_ids must be a non-empty array");
  }

  const project = await requireOwnedProject(base44, userId, project_id);
  const uniqueIds = new Set(ordered_video_ids);
  if (uniqueIds.size !== ordered_video_ids.length) {
    throw new SecureBriefMutationError(400, "ordered_video_ids must not contain duplicates");
  }

  const projectVideos = await base44.asServiceRole.entities.VideoBrief.filter({ project_id: project.id });
  if (projectVideos.length !== ordered_video_ids.length) {
    throw new SecureBriefMutationError(400, "ordered_video_ids must include every video in the brief package");
  }

  const projectVideoIds = new Set(projectVideos.map((video) => video.id));
  for (const videoId of ordered_video_ids) {
    if (!projectVideoIds.has(videoId)) {
      const externalVideo = await base44.asServiceRole.entities.VideoBrief.filter({ id: videoId });
      if (externalVideo[0]) {
        throw new SecureBriefMutationError(403, "Forbidden: reorder list includes a video from another project");
      }
      throw new SecureBriefMutationError(404, `VideoBrief not found: ${videoId}`);
    }
  }

  const updates = await Promise.all(
    ordered_video_ids.map((videoId, index) =>
      base44.asServiceRole.entities.VideoBrief.update(videoId, { video_order: index + 1 })
    )
  );

  return { video_briefs: updates };
}

async function handleMarkProjectExported(base44, userId, body) {
  const project = await requireOwnedProject(base44, userId, body.project_id);
  const updated = await base44.asServiceRole.entities.Project.update(project.id, {
    status: "exported",
  });
  return { project: updated };
}

async function handleGetOwnedUserBranding(base44, userId) {
  const existing = await base44.asServiceRole.entities.UserBranding.filter({ user_id: userId });
  return { branding: existing[0] || null };
}

async function handleUpdateUserBranding(base44, userId, body) {
  const brandingInput = sanitizeObject(body.branding || {}, "branding");
  const payload = pickFields(brandingInput, SAFE_BRANDING_FIELDS);
  const existing = await base44.asServiceRole.entities.UserBranding.filter({ user_id: userId });
  const currentBranding = existing[0];

  if (currentBranding) {
    const updated = await base44.asServiceRole.entities.UserBranding.update(currentBranding.id, payload);
    return { branding: updated };
  }

  const created = await base44.asServiceRole.entities.UserBranding.create({
    ...payload,
    user_id: userId,
  });
  return { branding: created };
}

export async function runSecureBriefMutation(base44, userId, body) {
  if (!userId) {
    throw new SecureBriefMutationError(401, "Unauthorized");
  }

  const action = body?.action;
  if (!action) {
    throw new SecureBriefMutationError(400, "action is required");
  }

  switch (action) {
    case "getOwnedVideoBrief":
      return handleGetOwnedVideoBrief(base44, userId, body);
    case "updateVideoBriefField":
      return handleUpdateVideoBriefField(base44, userId, body);
    case "saveFinalVideoBrief":
      return handleSaveFinalVideoBrief(base44, userId, body);
    case "deleteVideoFromBriefPackage":
      return handleDeleteVideoFromBriefPackage(base44, userId, body);
    case "reorderVideosInBriefPackage":
      return handleReorderVideosInBriefPackage(base44, userId, body);
    case "markProjectExported":
      return handleMarkProjectExported(base44, userId, body);
    case "getOwnedUserBranding":
      return handleGetOwnedUserBranding(base44, userId);
    case "updateUserBranding":
      return handleUpdateUserBranding(base44, userId, body);
    default:
      throw new SecureBriefMutationError(400, `Unknown action: ${action}`);
  }
}

export function toErrorResponse(error) {
  if (error instanceof OwnedProjectError || error instanceof SecureBriefMutationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}
