import type { ApprovalRole, CorrectionKind } from "./types";

export const APPROVAL_REQUIREMENTS: Record<CorrectionKind, ApprovalRole[]> = {
  transfer: ["correction-logistics-manager", "correction-gl"],
  "nok-block": ["correction-quality-manager", "correction-logistics-manager"],
  scrapping: [
    "correction-gl",
    "correction-logistics-manager",
    "correction-quality-manager",
    "correction-finance-manager",
  ],
};

export const AUTO_TARGET_WAREHOUSES: Partial<Record<CorrectionKind, string>> = {
  "nok-block": "JA10",
  scrapping: "SCRAP",
};

export const CORRECTION_STATUSES = [
  "draft",
  "submitted",
  "in-approval",
  "approved",
  "rejected",
  "posted",
  "cancelled",
] as const;

export const CORRECTION_KINDS = [
  "transfer",
  "nok-block",
  "scrapping",
] as const;
