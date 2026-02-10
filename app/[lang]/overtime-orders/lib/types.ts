import { EmployeeType } from '@/lib/types/employee-types';

export type DepartmentConfig = {
  _id: string;
  value: string;        // kebab-case English name (e.g., "form-service")
  name: string;         // English display name (e.g., "Form Service") 
  namePl: string;       // Polish display name (e.g., "Serwis form")
  nameDe: string;       // German display name (e.g., "Formservice")
  hourlyRate: number;
  currency: string;
};

export type OvertimeStatus =
  | 'pending'
  | 'pre_approved'
  | 'approved'
  | 'canceled'
  | 'completed'
  | 'accounted';



export type ArticleQuantityType = {
  articleNumber: string;
  quantity: number;
};

export type OvertimeType = {
  _id: string;
  internalId?: string; // Format: "N/YY", e.g. "1/25" - Optional as existing orders don't have it
  status: OvertimeStatus;
  department?: string; // Department selection (matches DepartmentConfig.value)
  quarry?: string; // Quarry number for production department (e.g., Q1-Q6 or custom)
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
  pendingAt?: Date;
  pendingBy?: string;
  preApprovedAt?: Date;
  preApprovedBy?: string;
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
  // New fields for forecasting with multiple articles
  plannedArticles?: ArticleQuantityType[];
  actualArticles?: ArticleQuantityType[];
  actualEmployeesWorked?: number;
};

export type overtimeRequestEmployeeType = EmployeeType & {
  agreedReceivingAt?: Date; // Date of receiving a day off
  agreedReceivingAtLocaleString?: string;
  note?: string;
};

// Helper function to display department name (returns English name as fallback)
export function getDepartmentDisplayName(departmentValue: string): string {
  return departmentValue
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
