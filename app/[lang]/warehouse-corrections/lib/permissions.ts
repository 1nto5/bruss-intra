// Pure synchronous role-checking helpers.
// These live outside 'use server' because server action files
// require ALL exported functions to be async.

import type { ApprovalRole, CorrectionDoc } from "./types";

const APPROVAL_ROLES: ApprovalRole[] = [
  "correction-logistics-manager",
  "correction-finance-manager",
  "correction-gl",
  "correction-quality-manager",
];

function isAdmin(roles: string[]): boolean {
  return roles.includes("admin");
}

export function canCreateCorrection(roles: string[]): boolean {
  // Any authenticated user can create a correction
  return roles.length > 0;
}

export function canEditCorrection(
  roles: string[],
  email: string,
  correction: CorrectionDoc,
): boolean {
  const statusAllowed =
    correction.status === "draft" || correction.status === "rejected";
  if (!statusAllowed) return false;
  return correction.createdBy === email || isAdmin(roles);
}

export function canSubmitCorrection(
  roles: string[],
  email: string,
  correction: CorrectionDoc,
): boolean {
  const statusAllowed =
    correction.status === "draft" || correction.status === "rejected";
  if (!statusAllowed) return false;
  return correction.createdBy === email || isAdmin(roles);
}

export function canCancelCorrection(
  roles: string[],
  email: string,
  correction: CorrectionDoc,
): boolean {
  if (correction.status !== "draft") return false;
  return correction.createdBy === email || isAdmin(roles);
}

export function canApprove(roles: string[], approvalRole: ApprovalRole): boolean {
  return roles.includes(approvalRole) || isAdmin(roles);
}

export function canPost(roles: string[]): boolean {
  return roles.includes("correction-sap-poster") || isAdmin(roles);
}

export function canAccessApprovalQueue(roles: string[]): boolean {
  if (isAdmin(roles)) return true;
  return APPROVAL_ROLES.some((role) => roles.includes(role));
}

export function canAccessPostingQueue(roles: string[]): boolean {
  return roles.includes("correction-sap-poster") || isAdmin(roles);
}

export function canViewAllCorrections(roles: string[]): boolean {
  if (isAdmin(roles)) return true;
  if (roles.includes("correction-sap-poster")) return true;
  return APPROVAL_ROLES.some((role) => roles.includes(role));
}

export function getApprovalRolesForUser(roles: string[]): ApprovalRole[] {
  if (isAdmin(roles)) return [...APPROVAL_ROLES];
  return APPROVAL_ROLES.filter((role) => roles.includes(role));
}

export function canDeleteCorrection(roles: string[]): boolean {
  return isAdmin(roles);
}

export function canReactivateCorrection(
  roles: string[],
  correction: CorrectionDoc,
): boolean {
  return isAdmin(roles) && correction.status === "cancelled";
}

export function canAccessModule(roles: string[]): boolean {
  if (isAdmin(roles)) return true;
  if (roles.includes("correction-sap-poster")) return true;
  if (APPROVAL_ROLES.some((role) => roles.includes(role))) return true;
  // Any authenticated user can access (to create corrections)
  return roles.length > 0;
}
