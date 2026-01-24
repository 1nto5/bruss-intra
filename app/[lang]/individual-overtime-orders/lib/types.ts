// Status options for individual overtime orders
export type OrderStatus =
  | 'pending'
  | 'pending-plant-manager'
  | 'approved'
  | 'rejected'
  | 'accounted'
  | 'cancelled';

// Status values for filters
export const ORDER_FILTER_STATUSES = [
  'pending',
  'pending-plant-manager',
  'approved',
  'rejected',
  'accounted',
  'cancelled',
] as const satisfies readonly OrderStatus[];

// Correction history entry - tracks all corrections with required reason
export type CorrectionHistoryEntry = {
  correctedAt: Date;
  correctedBy: string;
  reason: string;
  statusChanged?: { from: OrderStatus; to: OrderStatus };
  changes: {
    supervisor?: { from: string; to: string };
    hours?: { from: number; to: number };
    reason?: { from: string; to: string };
    payment?: { from: boolean; to: boolean };
    scheduledDayOff?: { from: Date | undefined; to: Date | undefined };
    workStartTime?: { from: Date; to: Date };
    workEndTime?: { from: Date; to: Date };
  };
};

// Complete individual overtime order type
export type IndividualOvertimeOrderType = {
  _id: string;
  employeeIdentifier: string; // Employee identifier from Employees collection
  employeeEmail?: string; // Employee email (optional - from Employees.email)
  employeeName?: string; // Computed: firstName + lastName from employees collection
  supervisor: string;
  hours: number;
  reason?: string;
  scheduledDayOff?: Date;
  workStartTime: Date;
  workEndTime: Date;
  internalId?: string; // Format: "N/YY", e.g. "1/25"
  status: OrderStatus;
  submittedAt: Date;
  submittedBy?: string; // Legacy field (deprecated)
  createdBy: string; // Email of manager who created the order
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
  supervisorFinalApproval?: boolean;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  correctionHistory?: CorrectionHistoryEntry[];
};
