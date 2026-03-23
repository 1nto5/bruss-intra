// Correction type enum
export type CorrectionKind = "transfer" | "nok-block" | "scrapping";

// Statuses
export type CorrectionStatus =
  | "draft"
  | "submitted"
  | "in-approval"
  | "approved"
  | "rejected"
  | "posted"
  | "cancelled";

// Approval roles
export type ApprovalRole =
  | "logistics-manager"
  | "finance-manager"
  | "gl"
  | "quality-manager";

export type ApprovalStatus = "pending" | "approved" | "rejected";

// Line item (embedded in correction document)
export type CorrectionItem = {
  articleNumber: string;
  articleName: string;
  quarry?: string;
  batch: string;
  quantity: number;
  unitPrice: number;
  value: number;
  comment?: string;
};

// Main correction document (wh_corrections collection)
export type CorrectionDoc = {
  _id: string;
  correctionNumber: string;
  type: CorrectionKind;
  sourceWarehouse: string;
  targetWarehouse: string;
  reason: string;
  status: CorrectionStatus;
  items: CorrectionItem[];
  totalValue: number;
  createdAt: string | Date;
  createdBy: string;
  editedAt?: string | Date;
  editedBy?: string;
  submittedAt?: string | Date;
  submittedBy?: string;
  completedAt?: string | Date;
  postedAt?: string | Date;
  postedBy?: string;
  cancelledAt?: string | Date;
  cancelledBy?: string;
  rejectedAt?: string | Date;
  rejectedBy?: string;
  rejectionReason?: string;
  deletedAt?: string | Date;
  deletedBy?: string;
  reactivatedAt?: string | Date;
  reactivatedBy?: string;
};

// Approval record (wh_corrections_approvals collection)
export type ApprovalRecord = {
  _id: string;
  correctionId: string;
  correctionNumber: string;
  role: ApprovalRole;
  status: ApprovalStatus;
  decidedBy?: string;
  decidedAt?: string | Date;
  rejectionReason?: string;
  createdAt: string | Date;
};

// Comment (wh_corrections_comments collection)
export type CorrectionComment = {
  _id: string;
  correctionId: string;
  content: string;
  createdBy: string;
  createdAt: string | Date;
};

// Audit log entry (wh_corrections_audit_log collection)
export type AuditLogEntry = {
  _id: string;
  correctionId: string;
  action:
    | "created"
    | "edited"
    | "submitted"
    | "approved"
    | "rejected"
    | "commented"
    | "posted"
    | "cancelled"
    | "resubmitted"
    | "deleted"
    | "reactivated";
  performedBy: string;
  performedAt: string | Date;
  details?: Record<string, unknown>;
};

// Reference data types
export type ArticleType = {
  _id: string;
  articleNumber: string;
  articleName: string;
  unitPrice: number;
  active: boolean;
  createdAt: string | Date;
  createdBy: string;
};

export type WarehouseType = {
  _id: string;
  value: string;
  label: string;
  isNokTarget: boolean;
  isScrapTarget: boolean;
  active: boolean;
};

export type QuarryType = {
  _id: string;
  value: string;
  label: string;
  active: boolean;
};

export type ReasonType = {
  _id: string;
  value: string;
  label: string;
  pl: string;
  de: string;
  active: boolean;
};

// Correction with joined data for detail view
export type CorrectionWithDetails = CorrectionDoc & {
  approvals: ApprovalRecord[];
  comments: CorrectionComment[];
  auditLog: AuditLogEntry[];
};

// Statistics types
export type CorrectionStatistics = {
  summary: {
    totalCount: number;
    totalValue: number;
    avgApprovalTimeHours: number;
  };
  byType: {
    type: CorrectionKind;
    count: number;
    value: number;
  }[];
  byQuarry: {
    quarry: string;
    totalQuantity: number;
    totalValue: number;
  }[];
  topArticles: {
    articleNumber: string;
    articleName: string;
    quantity: number;
    value: number;
    count: number;
  }[];
  byUser: {
    user: string;
    count: number;
    value: number;
  }[];
  rejections: {
    rejectedBy: string;
    count: number;
  }[];
  monthlyTrend: {
    year: number;
    month: number;
    count: number;
    value: number;
  }[];
};
