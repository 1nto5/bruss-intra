export function hasAdminAccess(roles: string[]): boolean {
  return roles.includes("aviso-admin") || roles.includes("admin");
}

export function hasProcessAccess(roles: string[]): boolean {
  return roles.includes("aviso-process") || hasAdminAccess(roles);
}

export function canViewHistory(roles: string[]): boolean {
  return hasAdminAccess(roles);
}
