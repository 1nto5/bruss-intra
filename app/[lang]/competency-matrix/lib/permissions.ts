// Pure synchronous role-checking helpers.
// These live outside 'use server' because server action files
// require ALL exported functions to be async.

export function isHrOrAdmin(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r === 'admin' ||
      r === 'hr' ||
      r === 'hr-manager',
  );
}

export function isManager(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r.includes('manager') ||
      r.includes('group-leader') ||
      r.includes('team-leader'),
  );
}

export function canManageCompetencies(roles: string[]): boolean {
  return isHrOrAdmin(roles);
}

export function canDeleteCompetencies(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('hr-manager');
}

export function canApproveAssessments(roles: string[]): boolean {
  return isHrOrAdmin(roles);
}

export function canSupervisorAssess(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r === 'admin' ||
      r.includes('team-leader') ||
      r.includes('group-leader') ||
      r.includes('manager'),
  );
}
