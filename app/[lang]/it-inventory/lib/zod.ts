import * as z from 'zod';

// Equipment categories
const equipmentCategorySchema = z.enum([
  'notebook',
  'workstation',
  'monitor',
  'iphone',
  'android',
  'printer',
  'label-printer',
  'portable-scanner',
]);

// Equipment statuses (array, min 1)
const equipmentStatusSchema = z.enum([
  'in-use',
  'in-stock',
  'damaged',
  'to-dispose',
  'disposed',
  'to-review',
  'to-repair',
]);

// Connection types
const connectionTypeSchema = z.enum(['USB', 'Network', 'Bluetooth', 'WiFi']);

// Factory function for create schema with i18n validation messages
export function createNewItemSchema(validation: {
  categoryRequired: string;
  assetNumberRequired: string;
  manufacturerRequired: string;
  modelRequired: string;
  serialNumberRequired: string;
  purchaseDateRequired: string;
  purchaseDateFuture: string;
  statusesMinOne: string;
  connectionTypeRequired: string;
  ipAddressInvalid: string;
}) {
  return z
    .object({
      category: equipmentCategorySchema.refine((val) => val !== undefined, {
        message: validation.categoryRequired,
      }),
      assetNumber: z.string().optional(),
      manufacturer: z.string().nonempty({
        message: validation.manufacturerRequired,
      }),
      model: z.string().nonempty({
        message: validation.modelRequired,
      }),
      serialNumber: z.string().nonempty({
        message: validation.serialNumberRequired,
      }),
      purchaseDate: z.date({
        message: validation.purchaseDateRequired,
      }),
      statuses: z
        .array(equipmentStatusSchema)
        .min(1, { message: validation.statusesMinOne }),
      connectionType: connectionTypeSchema.optional(),
      ipAddress: z.string().optional(),
      lastReview: z.date().optional(),
      notes: z.string().optional(),
      department: z.string().optional(),
    })
    .refine((data) => data.purchaseDate <= new Date(), {
      message: validation.purchaseDateFuture,
      path: ['purchaseDate'],
    })
    .refine(
      (data) => {
        // Asset number required for all except monitors
        if (data.category !== 'monitor') {
          return data.assetNumber && data.assetNumber.trim().length > 0;
        }
        return true;
      },
      {
        message: validation.assetNumberRequired,
        path: ['assetNumber'],
      },
    )
    .refine(
      (data) => {
        // If category is printer/scanner, connectionType is required
        const requiresConnectionType = [
          'printer',
          'label-printer',
          'portable-scanner',
        ].includes(data.category);
        if (requiresConnectionType && !data.connectionType) {
          return false;
        }
        return true;
      },
      {
        message: validation.connectionTypeRequired,
        path: ['connectionType'],
      },
    )
    .refine(
      (data) => {
        // If ipAddress is provided, validate it's a valid IP
        if (data.ipAddress && data.ipAddress.trim() !== '') {
          const ipRegex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          return ipRegex.test(data.ipAddress);
        }
        return true;
      },
      {
        message: validation.ipAddressInvalid,
        path: ['ipAddress'],
      },
    );
}

export type NewItemType = z.infer<ReturnType<typeof createNewItemSchema>>;

// Edit schema (similar to create, but all fields optional except those that shouldn't change)
export function createEditItemSchema(validation: {
  manufacturerRequired: string;
  modelRequired: string;
  serialNumberRequired: string;
  purchaseDateRequired: string;
  purchaseDateFuture: string;
  statusesMinOne: string;
  connectionTypeRequired: string;
  ipAddressInvalid: string;
}) {
  return z
    .object({
      assetNumber: z.string().optional(),
      manufacturer: z.string().nonempty({
        message: validation.manufacturerRequired,
      }),
      model: z.string().nonempty({
        message: validation.modelRequired,
      }),
      serialNumber: z.string().nonempty({
        message: validation.serialNumberRequired,
      }),
      purchaseDate: z.date({
        message: validation.purchaseDateRequired,
      }),
      statuses: z
        .array(equipmentStatusSchema)
        .min(1, { message: validation.statusesMinOne }),
      connectionType: connectionTypeSchema.optional(),
      ipAddress: z.string().optional(),
      lastReview: z.date().optional(),
      notes: z.string().optional(),
      department: z.string().optional(),
    })
    .refine((data) => data.purchaseDate <= new Date(), {
      message: validation.purchaseDateFuture,
      path: ['purchaseDate'],
    })
    .refine(
      (data) => {
        // If ipAddress is provided, validate it's a valid IP
        if (data.ipAddress && data.ipAddress.trim() !== '') {
          const ipRegex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          return ipRegex.test(data.ipAddress);
        }
        return true;
      },
      {
        message: validation.ipAddressInvalid,
        path: ['ipAddress'],
      },
    );
}

export type EditItemType = z.infer<ReturnType<typeof createEditItemSchema>>;

// Assign employee schema
export function createAssignEmployeeSchema(validation: {
  employeeRequired: string;
  assignmentDateRequired: string;
  assignmentDateFuture: string;
  customNameRequired?: string;
}) {
  return z
    .object({
      assignmentType: z.enum(['employee', 'custom']),
      employeeIdentifier: z.string().optional(),
      customName: z.string().optional(),
      assignedAt: z.date({
        message: validation.assignmentDateRequired,
      }),
      reason: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.assignmentType === 'employee') {
          return data.employeeIdentifier && data.employeeIdentifier.length > 0;
        }
        return true;
      },
      {
        message: validation.employeeRequired,
        path: ['employeeIdentifier'],
      },
    )
    .refine(
      (data) => {
        if (data.assignmentType === 'custom') {
          return data.customName && data.customName.length > 0;
        }
        return true;
      },
      {
        message: validation.customNameRequired || 'Enter custom name!',
        path: ['customName'],
      },
    )
    .refine((data) => data.assignedAt <= new Date(), {
      message: validation.assignmentDateFuture,
      path: ['assignedAt'],
    });
}

export type AssignEmployeeType = z.infer<
  ReturnType<typeof createAssignEmployeeSchema>
>;

// Unassign employee schema
export function createUnassignEmployeeSchema(validation: {
  reasonOptional: string;
  statusesRequiredForUnassign: string;
}) {
  return z.object({
    reason: z.string().optional(),
    statuses: z
      .array(equipmentStatusSchema)
      .min(1, { message: validation.statusesRequiredForUnassign }),
  });
}

export type UnassignEmployeeType = z.infer<
  ReturnType<typeof createUnassignEmployeeSchema>
>;

// Bulk status update schema (no user-facing validation messages, so no factory needed)
export const BulkStatusUpdateSchema = z.object({
  statusesToAdd: z.array(equipmentStatusSchema).optional().default([]),
  statusesToRemove: z.array(equipmentStatusSchema).optional().default([]),
});

export type BulkStatusUpdateType = z.infer<typeof BulkStatusUpdateSchema>;
