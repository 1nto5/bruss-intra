// Update the status options for overtime submissions
export type OvertimeStatus =
  | 'pending'
  | 'pending-plant-manager'
  | 'approved'
  | 'rejected'
  | 'accounted'
  | 'cancelled';

// Status values that should appear in filters
export const OVERTIME_FILTER_STATUSES = [
  'pending',
  'pending-plant-manager',
  'approved',
  'rejected',
  'accounted',
  'cancelled',
] as const satisfies readonly OvertimeStatus[];

// Edit history entry - stores only changed fields (deprecated, keeping for backward compatibility)
export type EditHistoryEntry = {
  editedAt: Date;
  editedBy: string; // Email of the user who made the edit
  changes: {
    // Only fields that were actually changed
    supervisor?: { from: string; to: string };
    date?: { from: Date; to: Date };
    hours?: { from: number; to: number };
    reason?: { from: string; to: string };
    overtimeRequest?: { from: boolean; to: boolean };
    payment?: { from: boolean; to: boolean };
    scheduledDayOff?: { from: Date | undefined; to: Date | undefined };
    status?: { from: OvertimeStatus; to: OvertimeStatus };
  };
};

// Correction history entry - tracks all corrections with required reason
export type CorrectionHistoryEntry = {
  correctedAt: Date;
  correctedBy: string; // Email of the user who made the correction
  reason: string; // Required reason for correction
  statusChanged?: { from: OvertimeStatus; to: OvertimeStatus }; // Track if cancelled during correction
  changes: {
    supervisor?: { from: string; to: string };
    date?: { from: Date; to: Date };
    hours?: { from: number; to: number };
    reason?: { from: string; to: string };
    overtimeRequest?: { from: boolean; to: boolean };
    payment?: { from: boolean; to: boolean };
    scheduledDayOff?: { from: Date | undefined; to: Date | undefined };
  };
};

// Complete overtime submission type with all database fields
export type OvertimeSubmissionType = {
  _id: string;
  supervisor: string;
  date: Date;
  hours: number;
  reason?: string;
  overtimeRequest?: boolean;
  scheduledDayOff?: Date;
  workStartTime?: Date;
  workEndTime?: Date;
  internalId?: string; // Format: "N/YY", e.g. "1/25" - Optional as existing submissions don't have it
  status: OvertimeStatus;
  submittedAt: Date;
  submittedBy: string; // Email of the employee who submitted
  createdBy?: string; // Email of HR/Admin who created on behalf of employee (undefined if self-submitted)
  editedAt?: Date;
  editedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  accountedAt?: Date;
  accountedBy?: string;
  payment: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  plantManagerApprovedAt?: Date;
  plantManagerApprovedBy?: string;
  supervisorApprovedAt?: Date;
  supervisorApprovedBy?: string;
  editHistory?: EditHistoryEntry[]; // Deprecated, keeping for backward compatibility
  correctionHistory?: CorrectionHistoryEntry[]; // New correction history with required reasons
};
