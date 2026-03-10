// Pure synchronous role-checking helpers.
// These live outside 'use server' because server action files
// require ALL exported functions to be async.

export function hasFullAccess(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r === "admin" ||
      r === "hr" ||
      r === "hr-manager" ||
      r === "plant-manager",
  );
}

export function isManager(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r.includes("manager") ||
      r.includes("group-leader") ||
      r.includes("team-leader"),
  );
}

export function canManageCompetencies(roles: string[]): boolean {
  return hasFullAccess(roles);
}

export function canDeleteCompetencies(roles: string[]): boolean {
  return roles.includes("admin") || roles.includes("hr-manager");
}

export function canSupervisorAssess(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r === "admin" ||
      r.includes("team-leader") ||
      r.includes("group-leader") ||
      r.includes("manager"),
  );
}
