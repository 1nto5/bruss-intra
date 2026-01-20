import { EmployeeType } from '@/lib/types/employee-types';

// Equipment categories
export type EquipmentCategory =
  | 'notebook'
  | 'workstation'
  | 'monitor'
  | 'iphone'
  | 'android'
  | 'printer'
  | 'label-printer'
  | 'portable-scanner';

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  'notebook',
  'workstation',
  'monitor',
  'iphone',
  'android',
  'printer',
  'label-printer',
  'portable-scanner',
];

// Equipment statuses (can have multiple)
export type EquipmentStatus =
  | 'in-use'
  | 'in-stock'
  | 'damaged'
  | 'to-dispose'
  | 'disposed'
  | 'to-review'
  | 'to-repair';

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  'in-use',
  'in-stock',
  'damaged',
  'to-dispose',
  'disposed',
  'to-review',
  'to-repair',
];

// Connection types for printers/scanners
export type ConnectionType = 'USB' | 'Network' | 'Bluetooth' | 'WiFi';

export const CONNECTION_TYPES: ConnectionType[] = ['USB', 'Network', 'Bluetooth', 'WiFi'];

// Assignment types - discriminated union
export type EmployeeAssignment = {
  type: 'employee';
  employee: EmployeeType;
};

export type CustomAssignment = {
  type: 'custom';
  customName: string; // Room, office, or any custom text
};

export type AssignmentTarget = EmployeeAssignment | CustomAssignment;

// Assignment record for history
export type AssignmentRecord = {
  assignment: AssignmentTarget;
  assignedAt: Date;
  assignedBy: string; // User email
  unassignedAt?: Date;
  unassignedBy?: string; // User email
  reason?: string; // Optional note
};

// Current assignment
export type CurrentAssignment = {
  assignment: AssignmentTarget;
  assignedAt: Date;
  assignedBy: string; // User email
};

// Main IT inventory item type
export type ITInventoryItem = {
  _id: string;
  assetId: string; // Auto-generated: e.g., "NB-MRG-001", "042" (monitors)
  category: EquipmentCategory;

  // Common required fields
  manufacturer: string;
  model: string;
  serialNumber: string;
  purchaseDate: Date;

  // Multi-status (array of statuses)
  statuses: EquipmentStatus[];

  // Employee assignment
  currentAssignment?: CurrentAssignment;
  assignmentHistory: AssignmentRecord[];

  // Conditional fields (printers/scanners)
  connectionType?: ConnectionType;
  ipAddress?: string;

  // Last review/inspection date
  lastReview?: Date;

  // Optional notes
  notes?: string;

  // Department
  department?: string;

  // Audit trail
  createdAt: Date;
  createdBy: string; // User email
  editedAt: Date;
  editedBy: string; // User email
};

// Helper type for insert (without auto-generated fields)
export type InsertITInventoryItem = Omit<
  ITInventoryItem,
  '_id' | 'assetId' | 'createdAt' | 'createdBy' | 'editedAt' | 'editedBy' | 'assignmentHistory'
> & {
  assignmentHistory?: AssignmentRecord[];
};

// Helper type for update
export type UpdateITInventoryItem = Partial<
  Omit<ITInventoryItem, '_id' | 'assetId' | 'createdAt' | 'createdBy'>
>;

// Asset ID prefix mapping
export const ASSET_ID_PREFIXES: Record<EquipmentCategory, string> = {
  notebook: 'NB-MRG-',
  workstation: 'WS-MRG-',
  monitor: '',
  iphone: 'SP-MRG-',
  android: 'AP-MRG-',
  printer: 'NP-MRG-',
  'label-printer': 'LP-MRG-',
  'portable-scanner': 'PS-MRG-',
};

// Helper function to get category display name
export function getCategoryDisplayName(category: EquipmentCategory): string {
  const names: Record<EquipmentCategory, string> = {
    notebook: 'Notebook',
    workstation: 'Workstation',
    monitor: 'Monitor',
    iphone: 'iPhone',
    android: 'Android',
    printer: 'Printer',
    'label-printer': 'Label Printer',
    'portable-scanner': 'Portable Scanner',
  };
  return names[category];
}

// Helper function to format asset ID with prefix
export function formatAssetId(category: EquipmentCategory, number: number): string {
  const prefix = ASSET_ID_PREFIXES[category];
  const paddedNumber = String(number).padStart(3, '0');
  return `${prefix}${paddedNumber}`;
}
