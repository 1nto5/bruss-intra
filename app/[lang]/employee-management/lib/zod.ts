import * as z from 'zod';

export const createEmployeeSchema = (validation: {
  identifierRequired: string;
  firstNameRequired: string;
  lastNameRequired: string;
}) => {
  return z.object({
    identifier: z.string().nonempty({ message: validation.identifierRequired }),
    firstName: z.string().nonempty({ message: validation.firstNameRequired }),
    lastName: z.string().nonempty({ message: validation.lastNameRequired }),
  });
};
