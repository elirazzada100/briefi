export function isAdminUser(user) {
  return Boolean(user && user.role === "admin");
}
