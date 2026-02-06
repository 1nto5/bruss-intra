import * as z from 'zod';

// ============================================================================
// FACTORY FUNCTIONS FOR TRANSLATED SCHEMAS
// ============================================================================

export const createNewOvertimeRequestSchema = (validation: {
  numberOfEmployeesMin: string;
  numberOfShiftsMin: string;
  responsibleEmailInvalid: string;
  responsibleRequired: string;
  dayOffDateRequired: string;
  fromDateRequired: string;
  toDateRequired: string;
  reasonRequired: string;
  fromDateInPast: string;
  toDateInPast: string;
  toDateBeforeFrom: string;
  durationMax24h: string;
  durationMin1h: string;
  employeesExceedsTotal: string;
  durationNotWholeOrHalf: string;
}) => {
  return z
    .object({
      numberOfEmployees: z
        .number()
        .min(1, { message: validation.numberOfEmployeesMin }),
      numberOfShifts: z
        .number()
        .min(1, { message: validation.numberOfShiftsMin }),
      responsibleEmployee: z
        .string()
        .email({ message: validation.responsibleEmailInvalid })
        .nonempty({ message: validation.responsibleRequired }),
      employeesWithScheduledDayOff: z
        .array(
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            identifier: z.string(),
            pin: z.string().optional(),
            agreedReceivingAt: z.date({
              message: validation.dayOffDateRequired,
            }),
            note: z.string().optional(),
          }),
        )
        .optional()
        .default([]),
      from: z.date({ message: validation.fromDateRequired }),
      to: z.date({ message: validation.toDateRequired }),
      reason: z.string().nonempty({ message: validation.reasonRequired }),
      note: z.string().optional(),
    })
    .refine((data) => data.from >= new Date(), {
      message: validation.fromDateInPast,
      path: ['from'],
    })
    .refine((data) => data.to >= new Date(), {
      message: validation.toDateInPast,
      path: ['to'],
    })
    .refine((data) => data.to >= data.from, {
      message: validation.toDateBeforeFrom,
      path: ['to'],
    })
    .refine(
      (data) => data.to.getTime() - data.from.getTime() <= 24 * 60 * 60 * 1000,
      { message: validation.durationMax24h, path: ['to'] },
    )
    .refine(
      (data) => data.to.getTime() - data.from.getTime() >= 1 * 60 * 60 * 1000,
      {
        message: validation.durationMin1h,
        path: ['to'],
      },
    )
    .refine(
      (data) =>
        (data.employeesWithScheduledDayOff?.length || 0) <=
        data.numberOfEmployees,
      {
        message: validation.employeesExceedsTotal,
        path: ['employeesWithScheduledDayOff'],
      },
    )
    .refine(
      (data) => {
        const durationMs = data.to.getTime() - data.from.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const isWholeOrHalf = durationHours % 0.5 === 0;
        return isWholeOrHalf;
      },
      {
        message: validation.durationNotWholeOrHalf,
        path: ['to'],
      },
    );
};

export const createAttachmentFormSchema = (validation: {
  fileRequired: string;
  fileEmpty: string;
  fileTooLarge: string;
}) => {
  return z.object({
    file: z
      .instanceof(File, { message: validation.fileRequired })
      .refine((file) => file.size > 0, { message: validation.fileEmpty })
      .refine((file) => file.size <= 10 * 1024 * 1024, {
        message: validation.fileTooLarge,
      }),
  });
};

export const createMultipleAttachmentFormSchema = (validation: {
  invalidFile: string;
  fileEmpty: string;
  fileTooLarge: string;
  filesMinOne: string;
  filesMaxTen: string;
  totalFileSizeExceeds: string;
}) => {
  return z.object({
    files: z
      .array(
        z
          .instanceof(File, { message: validation.invalidFile })
          .refine((file) => file.size > 0, { message: validation.fileEmpty })
          .refine((file) => file.size <= 10 * 1024 * 1024, {
            message: validation.fileTooLarge,
          }),
      )
      .min(1, { message: validation.filesMinOne })
      .max(10, { message: validation.filesMaxTen })
      .refine(
        (files) => {
          const totalSize = files.reduce((acc, file) => acc + file.size, 0);
          return totalSize <= 50 * 1024 * 1024;
        },
        { message: validation.totalFileSizeExceeds },
      ),
    mergeFiles: z.boolean().default(true),
  });
};

// ============================================================================
// INFERRED TYPES FROM FACTORY FUNCTIONS
// ============================================================================

export type NewOvertimeRequestType = z.infer<
  ReturnType<typeof createNewOvertimeRequestSchema>
>;

export type AttachmentFormType = z.infer<
  ReturnType<typeof createAttachmentFormSchema>
>;

export type MultipleAttachmentFormType = z.infer<
  ReturnType<typeof createMultipleAttachmentFormSchema>
>;
