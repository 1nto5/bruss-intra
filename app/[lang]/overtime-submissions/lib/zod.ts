import * as z from 'zod';

type DateValidationMessages = {
  futureDateNotAllowedForPositive: string;
  futureDateTooFar: string;
  pastDateTooFar: string;
};

type BaseValidationMessages = {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  dateRequired: string;
  hoursMinRange: string;
  hoursMaxRange: string;
  hoursIncrementInvalid: string;
  reasonRequired: string;
};

type EntryValidationMessages = BaseValidationMessages & DateValidationMessages;

function validateDateRange(
  data: { date: Date; hours: number },
  ctx: z.RefinementCtx,
  messages: DateValidationMessages,
): void {
  if (!data.date) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setHours(0, 0, 0, 0);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setHours(23, 59, 59, 999);
  thirtyDaysAhead.setDate(today.getDate() + 30);

  if (data.hours >= 0) {
    if (data.date < fourteenDaysAgo || data.date > endOfToday) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.futureDateNotAllowedForPositive,
        path: ['date'],
      });
    }
  } else {
    if (data.date < fourteenDaysAgo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.pastDateTooFar,
        path: ['date'],
      });
    } else if (data.date > thirtyDaysAhead) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.futureDateTooFar,
        path: ['date'],
      });
    }
  }
}

function isValidHalfHourIncrement(hours: number): boolean {
  return (hours * 2) % 1 === 0;
}

function isReasonRequiredAndPresent(hours: number, reason?: string): boolean {
  if (hours >= 0) {
    return !!reason && reason.trim().length > 0;
  }
  return true;
}

function createBaseOvertimeFields(validation: BaseValidationMessages) {
  return {
    supervisor: z
      .string()
      .email({ message: validation.supervisorEmailInvalid })
      .nonempty({ message: validation.supervisorRequired }),
    date: z.date({ message: validation.dateRequired }),
    hours: z
      .number()
      .min(-8, { message: validation.hoursMinRange })
      .max(16, { message: validation.hoursMaxRange }),
    reason: z.string().optional(),
  };
}

type OvertimeData = { date: Date; hours: number; reason?: string };

function applySharedRefinements<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  validation: EntryValidationMessages,
) {
  return schema
    .superRefine((data, ctx) =>
      validateDateRange(data as unknown as OvertimeData, ctx, validation),
    )
    .refine(
      (data) =>
        isValidHalfHourIncrement((data as unknown as OvertimeData).hours),
      {
        message: validation.hoursIncrementInvalid,
        path: ['hours'],
      },
    )
    .refine(
      (data) => {
        const d = data as unknown as OvertimeData;
        return isReasonRequiredAndPresent(d.hours, d.reason);
      },
      {
        message: validation.reasonRequired,
        path: ['reason'],
      },
    );
}

export function createOvertimeEntrySchema(validation: EntryValidationMessages) {
  return applySharedRefinements(
    z.object(createBaseOvertimeFields(validation)),
    validation,
  );
}

export function createOvertimeCorrectionSchema(
  validation: EntryValidationMessages & { correctionReasonRequired: string },
) {
  return applySharedRefinements(
    z.object({
      ...createBaseOvertimeFields(validation),
      correctionReason: z
        .string()
        .min(1, { message: validation.correctionReasonRequired }),
    }),
    validation,
  );
}

export const createOvertimeSubmissionSchema = createOvertimeEntrySchema;

export function createPayoutRequestSchema(validation: {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  hoursMinRange: string;
  hoursIncrementInvalid: string;
  reasonRequired: string;
}) {
  return z
    .object({
      supervisor: z
        .string()
        .email({ message: validation.supervisorEmailInvalid })
        .nonempty({ message: validation.supervisorRequired }),
      hours: z
        .number({ message: validation.hoursMinRange })
        .positive({ message: validation.hoursMinRange }),
      reason: z
        .string()
        .min(1, { message: validation.reasonRequired }),
    })
    .refine((data) => isValidHalfHourIncrement(data.hours), {
      message: validation.hoursIncrementInvalid,
      path: ['hours'],
    });
}
