import { ObjectId } from 'mongodb';

export type ApprovalType = {
  approved: boolean;
  by: string;
  at: Date | string;
  reason?: string; // Rejection reason when approved is false
  history?: ApprovalHistoryType[]; // History of approval status changes
};

export type ApprovalHistoryType = {
  approved: boolean;
  by: string;
  at: Date | string;
  reason?: string;
};

export type correctiveActionType = {
  description: string;
  responsible: string;
  deadline: Date;
  created: { at: Date; by: string };
  status: correctiveActionStatusType;
  history: correctiveActionStatusType[];
};

export type correctiveActionStatusType = {
  value: 'open' | 'closed' | 'overdue' | 'in progress' | 'rejected';
  comment?: string;
  executedAt: Date;
  changed: { at: Date; by: string };
};

export type AttachmentType = {
  filename: string;
  name: string;
  note?: string;
  uploadedBy: string;
  uploadedAt: Date | string;
  size: number;
  type: string;
};

export type NotificationLogType = {
  to: string;
  sentAt: Date;
  type: string; // Add this line
};

// NEW: Define PrintLogType
export type PrintLogType = {
  printedBy: string;
  printedAt: Date | string;
};

// RENAME: Define EditLogEntryType
export type EditLogEntryType = {
  changedAt: Date | string;
  changedBy: string;
  fieldName: string;
  oldValue: any; // Use 'any' for flexibility, or define more specific types if possible
  newValue: any;
};

// Define and export DeviationStatus type
export type DeviationStatus =
  | 'rejected'
  | 'approved'
  | 'in approval'
  | 'in progress'
  | 'closed'
  | 'draft'
  | 'to approve'
  | 'cancelled';

// Add a new type for notes
export type NoteType = {
  content: string;
  createdBy: string;
  createdAt: Date | string;
};

// Type for cancellation info
export type CancellationType = {
  by: string;
  at: Date | string;
  reason?: string;
};

export type DeviationType = {
  _id?: ObjectId;
  internalId?: string; // Format: "N/YYYY", e.g. "1/2023" - Optional as drafts don't have it
  status: DeviationStatus; // Use the defined type here
  articleNumber?: string; // Optional for draft
  articleName?: string; // Optional for draft
  workplace?: string; // Optional for draft
  customerNumber?: string; // Optional
  customerName?: string; // Optional
  quantity?: { value?: number; unit?: string }; // Optional for draft, value/unit can be optional too
  charge?: string; // Optional for draft
  reason?: string; // Optional for draft
  timePeriod?: { from?: Date | string | null; to?: Date | string | null }; // Optional dates for draft, allow null
  timePeriodLocalDateString?: { from: string; to: string }; // Keep this if used elsewhere, but source might be null
  area?: string; // Optional for draft
  description?: string; // Optional for draft
  processSpecification?: string; // Optional
  customerAuthorization?: boolean; // Optional for draft
  owner: string; // Required
  createdAt: Date | string; // Required
  // Approvals are optional by nature until set
  groupLeaderApproval?: ApprovalType;
  qualityManagerApproval?: ApprovalType;
  engineeringManagerApproval?: ApprovalType;
  maintenanceManagerApproval?: ApprovalType;
  productionManagerApproval?: ApprovalType;
  plantManagerApproval?: ApprovalType;
  correctiveActions: correctiveActionType[]; // Required, can be empty array
  attachments?: AttachmentType[]; // Optional
  notificationLogs?: NotificationLogType[]; // Optional
  editLogs?: EditLogEntryType[]; // RENAMED: from changeHistory
  printLogs?: PrintLogType[]; // NEW: Optional print logs
  notes?: NoteType[]; // NEW: Optional notes
  cancellation?: CancellationType; // Cancellation info when status is 'cancelled'
};

export type DeviationReasonType = {
  value: string;
  label: string;
  pl: string;
};

export type DeviationAreaType = {
  value: string;
  label: string;
  pl: string;
};
