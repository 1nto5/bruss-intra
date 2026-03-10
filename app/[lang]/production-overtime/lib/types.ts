import { EmployeeType } from "@/lib/types/employee-types";

// Add or update the status options to include 'completed'
export type OvertimeStatus =
  | "pending"
  | "approved"
  | "canceled"
  | "completed"
  | "accounted";

export type OvertimeType = {
  _id: string;
  status: OvertimeStatus;
  numberOfEmployees: number; // Number of employees in the order
  numberOfShifts: number; // Number of shifts
  responsibleEmployee: string; // Email of the responsible person
  employeesWithScheduledDayOff: overtimeRequestEmployeeType[]; // Employees who want to take time off
  from: Date;
  to: Date;
  reason: string;
  note: string;
  requestedAt: Date;
  requestedBy: string;
  editedAt: Date;
  editedBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  canceledAt?: Date;
  canceledBy?: string;
  completedAt?: Date;
  completedBy?: string;
  accountedAt?: Date;
  accountedBy?: string;
  hasAttachment?: boolean;
  attachmentFilename?: string;
};

export type overtimeRequestEmployeeType = EmployeeType & {
  agreedReceivingAt?: Date; // Date of receiving a day off
  agreedReceivingAtLocaleString?: string;
  note?: string;
};
