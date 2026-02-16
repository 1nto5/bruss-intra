import * as z from 'zod';

function createArticleQuantitySchema(validation: {
  articleNumberRequired: string;
  articleQuantityMustBeInteger: string;
  articleQuantityMin: string;
}) {
  return z.object({
    articleNumber: z
      .string()
      .nonempty({ message: validation.articleNumberRequired }),
    quantity: z
      .number()
      .int({ message: validation.articleQuantityMustBeInteger })
      .min(1, { message: validation.articleQuantityMin }),
  });
}

export function createNewOvertimeRequestSchema(validation: {
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
  departmentRequired: string;
  articleNumberRequired: string;
  articleQuantityMustBeInteger: string;
  articleQuantityMin: string;
}) {
  const articleQuantitySchema = createArticleQuantitySchema(validation);

  return z
    .object({
      department: z.string().nonempty({
        message: validation.departmentRequired,
      }),
      quarry: z.string().optional().default(''),
      numberOfEmployees: z
        .union([z.number(), z.string()])
        .transform((val) =>
          val === '' ? 1 : typeof val === 'string' ? parseInt(val) || 1 : val,
        )
        .pipe(
          z.number().min(1, {
            message: validation.numberOfEmployeesMin,
          }),
        ),
      numberOfShifts: z
        .union([z.number(), z.string()])
        .transform((val) =>
          val === '' ? 1 : typeof val === 'string' ? parseInt(val) || 1 : val,
        )
        .pipe(
          z.number().min(1, {
            message: validation.numberOfShiftsMin,
          }),
        ),
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
      plannedArticles: z.array(articleQuantitySchema).optional().default([]),
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
      (data) => {
        const durationMs = data.to.getTime() - data.from.getTime();
        // Round to seconds to avoid millisecond precision issues
        const durationSeconds = Math.floor(durationMs / 1000);
        const maxDurationSeconds = 24 * 60 * 60; // Exactly 24 hours in seconds
        // Allow up to and including exactly 24 hours, but not more
        return durationSeconds <= maxDurationSeconds;
      },
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
        const durationHours =
          (data.to.getTime() - data.from.getTime()) / (1000 * 60 * 60);
        return durationHours % 0.5 === 0;
      },
      {
        message: validation.durationNotWholeOrHalf,
        path: ['to'],
      },
    );
}

// Schema for completion/attendance upload with new fields
export function createAttendanceCompletionSchema(validation: {
  articleNumberRequired: string;
  articleQuantityMustBeInteger: string;
  articleQuantityMin: string;
  actualEmployeesMustBeInteger: string;
  actualEmployeesCannotBeNegative: string;
}) {
  const articleQuantitySchema = createArticleQuantitySchema(validation);

  return z.object({
    actualArticles: z.array(articleQuantitySchema).optional().default([]),
    actualEmployeesWorked: z
      .number()
      .int({ message: validation.actualEmployeesMustBeInteger })
      .min(0, { message: validation.actualEmployeesCannotBeNegative }),
  });
}

export function createAttachmentFormSchema(validation: {
  fileRequired: string;
  fileEmpty: string;
  fileTooLarge: string;
}) {
  return z.object({
    file: z
      .instanceof(File, { message: validation.fileRequired })
      .refine((file) => file.size > 0, { message: validation.fileEmpty })
      .refine((file) => file.size <= 10 * 1024 * 1024, {
        message: validation.fileTooLarge,
      }),
  });
}

export function createMultipleAttachmentFormSchema(validation: {
  invalidFile: string;
  fileEmpty: string;
  fileTooLarge: string;
  filesMinOne: string;
  filesMaxTen: string;
  totalFileSizeExceeds: string;
  articleNumberRequired: string;
  articleQuantityMustBeInteger: string;
  articleQuantityMin: string;
  actualEmployeesMustBeInteger: string;
  actualEmployeesCannotBeNegative: string;
}) {
  const articleQuantitySchema = createArticleQuantitySchema(validation);

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
          return totalSize <= 50 * 1024 * 1024; // 50MB total limit
        },
        { message: validation.totalFileSizeExceeds },
      ),
    mergeFiles: z.boolean().default(true).catch(true),
    actualArticles: z.array(articleQuantitySchema).default([]).catch([]),
    actualEmployeesWorked: z
      .number()
      .int({ message: validation.actualEmployeesMustBeInteger })
      .min(0, { message: validation.actualEmployeesCannotBeNegative }),
  });
}

// ============================================================================
// INFERRED TYPES FROM FACTORY FUNCTIONS
// ============================================================================

export type NewOvertimeRequestType = z.infer<
  ReturnType<typeof createNewOvertimeRequestSchema>
>;

export type AttendanceCompletionType = z.infer<
  ReturnType<typeof createAttendanceCompletionSchema>
>;

export type AttachmentFormType = z.infer<
  ReturnType<typeof createAttachmentFormSchema>
>;

export type MultipleAttachmentFormType = z.infer<
  ReturnType<typeof createMultipleAttachmentFormSchema>
>;
