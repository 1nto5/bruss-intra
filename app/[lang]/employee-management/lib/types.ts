export type ManagedEmployee = {
  _id: string;
  identifier: string;
  firstName: string;
  lastName: string;
  createdAt?: Date;
  createdBy?: string;
  editedAt?: Date;
  editedBy?: string;
};
