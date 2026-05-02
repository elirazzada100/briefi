export class OwnedProjectError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "OwnedProjectError";
    this.status = status;
  }
}

export async function requireOwnedProject(base44, userId, projectId) {
  if (!projectId) {
    throw new OwnedProjectError(400, "project_id is required");
  }

  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  const project = projects[0];

  if (!project) {
    throw new OwnedProjectError(404, "Project not found");
  }

  if (!project.owner_id) {
    throw new OwnedProjectError(403, "Forbidden: ownerless projects are not accessible");
  }

  if (project.owner_id !== userId) {
    throw new OwnedProjectError(403, "Forbidden: project does not belong to the authenticated user");
  }

  return project;
}
