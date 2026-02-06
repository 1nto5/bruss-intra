import * as z from 'zod';

// ============================================================================
// FACTORY FUNCTIONS FOR TRANSLATED SCHEMAS
// ============================================================================

export const createAddDeviationSchema = (validation: {
  articleNumberRequired: string;
  articleNumberMinLength: string;
  articleNameRequired: string;
  articleNameMinLength: string;
  quantityInvalid: string;
  unitRequired: string;
  unitRequiredWithQuantity: string;
  descriptionRequired: string;
  descriptionMinLength: string;
  reasonRequired: string;
  dateRequired: string;
  periodFromMinDate: string;
  periodFromMaxDate: string;
  periodToMaxDate: string;
  periodToBeforeFrom: string;
  areaRequired: string;
}) => {
  return z
    .object({
      articleNumber: z
        .string({ message: validation.articleNumberRequired })
        .min(5, { message: validation.articleNumberMinLength }),
      articleName: z
        .string({ message: validation.articleNameRequired })
        .min(5, { message: validation.articleNameMinLength }),
      customerNumber: z.string().optional(),
      customerName: z.string().optional(),
      workplace: z.string().optional(),
      quantity: z
        .string()
        .optional()
        .refine(
          (value) => !value || (!isNaN(Number(value)) && Number(value) > 0),
          {
            message: validation.quantityInvalid,
          },
        ),
      unit: z.string().min(1, { message: validation.unitRequired }).optional(),
      charge: z.string().optional(),
      description: z
        .string({ message: validation.descriptionRequired })
        .min(10, { message: validation.descriptionMinLength }),
      reason: z.string({ message: validation.reasonRequired }),
      periodFrom: z
        .date({ message: validation.dateRequired })
        .min(
          (() => {
            const today = new Date();
            today.setDate(today.getDate() - 7);
            today.setHours(0, 0, 0, 0);
            return today;
          })(),
          { message: validation.periodFromMinDate },
        )
        .max(
          (() => {
            const today = new Date();
            today.setDate(today.getDate() + 7);
            today.setHours(23, 59, 59, 999);
            return today;
          })(),
          { message: validation.periodFromMaxDate },
        ),
      periodTo: z.date({ message: validation.dateRequired }).max(
        (() => {
          const today = new Date();
          today.setDate(today.getDate() + 30);
          today.setHours(23, 59, 59, 999);
          return today;
        })(),
        { message: validation.periodToMaxDate },
      ),
      area: z.string({ message: validation.areaRequired }),
      processSpecification: z.string().optional(),
      customerAuthorization: z.boolean(),
    })
    .refine((data) => data.periodTo >= data.periodFrom, {
      message: validation.periodToBeforeFrom,
      path: ['periodTo'],
    })
    .refine(
      (data) => {
        const quantityValue = data.quantity ? Number(data.quantity) : NaN;
        if (
          data.quantity &&
          data.quantity.trim() !== '' &&
          !isNaN(quantityValue) &&
          quantityValue > 0
        ) {
          return data.unit && data.unit.trim() !== '';
        }
        return true;
      },
      {
        message: validation.unitRequiredWithQuantity,
        path: ['unit'],
      },
    );
};

export const createAddDeviationDraftSchema = (validation: {
  quantityInvalidOrEmpty: string;
  descriptionMinLengthOrEmpty: string;
  unitRequiredWithQuantity: string;
  periodToBeforeFrom: string;
}) => {
  return z
    .object({
      articleNumber: z.string().optional(),
      articleName: z.string().optional(),
      customerNumber: z.string().optional(),
      customerName: z.string().optional(),
      workplace: z.string().optional(),
      quantity: z
        .string()
        .optional()
        .nullable()
        .refine(
          (value) => !value || (!isNaN(Number(value)) && Number(value) >= 0),
          {
            message: validation.quantityInvalidOrEmpty,
          },
        ),
      unit: z.string().optional(),
      charge: z.string().optional(),
      description: z
        .string()
        .optional()
        .refine(
          (value) => !value || value.length === 0 || value.length >= 10,
          {
            message: validation.descriptionMinLengthOrEmpty,
          },
        ),
      reason: z.string().optional(),
      periodFrom: z.date().optional().nullable(),
      periodTo: z.date().optional().nullable(),
      area: z.string().optional(),
      processSpecification: z.string().optional(),
      customerAuthorization: z.boolean().optional(),
    })
    .refine(
      (data) => {
        const quantityValue = data.quantity ? Number(data.quantity) : NaN;
        if (
          data.quantity &&
          data.quantity.trim() !== '' &&
          !isNaN(quantityValue) &&
          quantityValue > 0
        ) {
          return data.unit && data.unit.trim() !== '';
        }
        return true;
      },
      {
        message: validation.unitRequiredWithQuantity,
        path: ['unit'],
      },
    )
    .refine(
      (data) => {
        if (data.periodFrom && data.periodTo) {
          return data.periodTo >= data.periodFrom;
        }
        return true;
      },
      {
        message: validation.periodToBeforeFrom,
        path: ['periodTo'],
      },
    );
};

export const createConfirmActionExecutionSchema = (validation: {
  statusRequired: string;
  executedAtRequired: string;
}) => {
  return z.object({
    comment: z.string().optional(),
    status: z.string({ message: validation.statusRequired }),
    executedAt: z.date({ message: validation.executedAtRequired }),
  });
};

export const createAttachmentFormSchema = (validation: {
  fileRequired: string;
  fileEmpty: string;
  fileTooLarge: string;
  attachmentNameRequired: string;
  attachmentNameTooShort: string;
}) => {
  return z.object({
    file: z
      .instanceof(File, { message: validation.fileRequired })
      .refine((file) => file.size > 0, { message: validation.fileEmpty })
      .refine((file) => file.size <= 10 * 1024 * 1024, {
        message: validation.fileTooLarge,
      }),
    name: z
      .string({ message: validation.attachmentNameRequired })
      .min(5, { message: validation.attachmentNameTooShort }),
    note: z.string().optional(),
  });
};

export const createRejectDeviationSchema = (validation: {
  rejectReasonRequired: string;
  rejectReasonMinLength: string;
  rejectReasonMaxLength: string;
}) => {
  return z.object({
    reason: z
      .string({ message: validation.rejectReasonRequired })
      .min(10, { message: validation.rejectReasonMinLength })
      .max(500, { message: validation.rejectReasonMaxLength }),
  });
};

export const createNoteFormSchema = (validation: {
  noteRequired: string;
  noteMaxLength: string;
}) => {
  return z.object({
    content: z
      .string()
      .min(1, validation.noteRequired)
      .max(1000, validation.noteMaxLength),
  });
};

export const createAddCorrectiveActionSchema = (validation: {
  descriptionRequired: string;
  descriptionMinLength: string;
  responsibleRequired: string;
  deadlineRequired: string;
}) => {
  return z.object({
    description: z
      .string({ message: validation.descriptionRequired })
      .min(10, { message: validation.descriptionMinLength }),
    responsible: z.string({ message: validation.responsibleRequired }),
    deadline: z.date({ message: validation.deadlineRequired }),
  });
};

// ============================================================================
// INFERRED TYPES FROM FACTORY FUNCTIONS
// ============================================================================

export type AddDeviationType = z.infer<
  ReturnType<typeof createAddDeviationSchema>
>;

export type AddDeviationDraftType = z.infer<
  ReturnType<typeof createAddDeviationDraftSchema>
>;

export type AddCorrectiveActionType = z.infer<
  ReturnType<typeof createAddCorrectiveActionSchema>
>;

export type confirmActionExecutionType = z.infer<
  ReturnType<typeof createConfirmActionExecutionSchema>
>;

export type AttachmentFormType = z.infer<
  ReturnType<typeof createAttachmentFormSchema>
>;

export type RejectDeviationType = z.infer<
  ReturnType<typeof createRejectDeviationSchema>
>;

export type NoteFormType = z.infer<ReturnType<typeof createNoteFormSchema>>;
