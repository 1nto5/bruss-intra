export function hasOvertimeViewAccess(roles: string[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(
    (role) =>
      role === 'admin' ||
      role === 'hr' ||
      role.includes('group-leader') ||
      role.includes('manager'),
  );
}
