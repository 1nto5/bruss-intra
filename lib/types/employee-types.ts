export type EmployeeType = {
  _id?: string;
  firstName: string;
  lastName: string;
  identifier: string;
  pin?: string;
  email?: string;
  manager?: string | null;
  department?: string | null;
  position?: string | null;
  hireDate?: Date | null;
  endDate?: Date | null;
  shiftGroup?: string;
  createdAt?: Date;
  createdBy?: string;
  editedAt?: Date;
  editedBy?: string;
};

export type InsertEmployeeType = Omit<EmployeeType, '_id'>;
