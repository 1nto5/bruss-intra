export type EmployeeType = {
  _id?: string;
  firstName: string;
  lastName: string;
  identifier: string;
  pin?: string;
  email?: string;
  createdAt?: Date;
  createdBy?: string;
  editedAt?: Date;
  editedBy?: string;
};

export type InsertEmployeeType = Omit<EmployeeType, '_id'>;
