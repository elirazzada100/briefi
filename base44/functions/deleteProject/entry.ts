import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id } = await req.json();
  if (!project_id) return Response.json({ error: "project_id required" }, { status: 400 });

  // Verify ownership
  const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
  const project = projects[0];
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  if (project.owner_id !== user.id) return Response.json({ error: "אין לך הרשאה למחוק את הפרויקט הזה." }, { status: 403 });

  // Delete related records first
  const [briefs, generations, choices, feedback, qchecks] = await Promise.all([
    base44.asServiceRole.entities.VideoBrief.filter({ project_id }),
    base44.asServiceRole.entities.Generation.filter({ project_id }),
    base44.asServiceRole.entities.UserChoice.filter({ project_id }),
    base44.asServiceRole.entities.UserFeedback.filter({ project_id }),
    base44.asServiceRole.entities.BriefQualityCheck.filter({ project_id }),
  ]);

  await Promise.all([
    ...briefs.map(r => base44.asServiceRole.entities.VideoBrief.delete(r.id)),
    ...generations.map(r => base44.asServiceRole.entities.Generation.delete(r.id)),
    ...choices.map(r => base44.asServiceRole.entities.UserChoice.delete(r.id)),
    ...feedback.map(r => base44.asServiceRole.entities.UserFeedback.delete(r.id)),
    ...qchecks.map(r => base44.asServiceRole.entities.BriefQualityCheck.delete(r.id)),
  ]);

  // Delete the project last
  await base44.asServiceRole.entities.Project.delete(project_id);

  return Response.json({ success: true });
});