export class AdminAccessError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

export function isAdminUser(user) {
  return Boolean(user && user.role === "admin");
}

export function requireAdminUser(user) {
  if (!user) {
    throw new AdminAccessError(401, "Unauthorized");
  }

  if (!isAdminUser(user)) {
    throw new AdminAccessError(403, "Forbidden: admin only");
  }

  return user;
}
