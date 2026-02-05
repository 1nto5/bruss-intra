import * as z from 'zod';

// ============================================================================
// FACTORY FUNCTIONS FOR TRANSLATED SCHEMAS
// ============================================================================

// Schema for regular overtime entries
export const createOvertimeEntrySchema = (validation: {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  dateRequired: string;
  hoursMinRange: string;
  hoursMaxRange: string;
  dateRangeInvalid: string;
  hoursIncrementInvalid: string;
  reasonRequired: string;
  futureDateNotAllowedForPositive: string;
  futureDateTooFar: string;
}) => {
  return z
    .object({
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
    })
    .superRefine((data, ctx) => {
      if (!data.date) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setHours(23, 59, 59, 999);
      thirtyDaysAhead.setDate(today.getDate() + 30);

      if (data.hours >= 0) {
        // Positive hours: last 7 days to today only
        if (data.date < sevenDaysAgo || data.date > endOfToday) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.futureDateNotAllowedForPositive,
            path: ['date'],
          });
        }
      } else {
        // Negative hours: last 7 days to 30 days ahead
        if (data.date < sevenDaysAgo || data.date > thirtyDaysAhead) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.futureDateTooFar,
            path: ['date'],
          });
        }
      }
    })
    .refine(
      (data) => {
        const isValidIncrement = (data.hours * 2) % 1 === 0;
        return isValidIncrement;
      },
      {
        message: validation.hoursIncrementInvalid,
        path: ['hours'],
      },
    )
    .refine(
      (data) => {
        if (data.hours >= 0) {
          return !!data.reason && data.reason.trim().length > 0;
        }
        return true;
      },
      {
        message: validation.reasonRequired,
        path: ['reason'],
      },
    );
};

// ============================================================================
// CORRECTION SCHEMAS (without date range restrictions)
// ============================================================================

// Schema for correcting regular overtime entries (with 7-day date range restriction)
export const createOvertimeCorrectionSchema = (validation: {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  dateRequired: string;
  hoursMinRange: string;
  hoursMaxRange: string;
  hoursIncrementInvalid: string;
  reasonRequired: string;
  dateRangeInvalid: string;
  correctionReasonRequired: string;
  futureDateNotAllowedForPositive: string;
  futureDateTooFar: string;
}) => {
  return z
    .object({
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
      correctionReason: z
        .string()
        .min(1, { message: validation.correctionReasonRequired }),
    })
    .superRefine((data, ctx) => {
      if (!data.date) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setHours(23, 59, 59, 999);
      thirtyDaysAhead.setDate(today.getDate() + 30);

      if (data.hours >= 0) {
        // Positive hours: last 7 days to today only
        if (data.date < sevenDaysAgo || data.date > endOfToday) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.futureDateNotAllowedForPositive,
            path: ['date'],
          });
        }
      } else {
        // Negative hours: last 7 days to 30 days ahead
        if (data.date < sevenDaysAgo || data.date > thirtyDaysAhead) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.futureDateTooFar,
            path: ['date'],
          });
        }
      }
    })
    .refine(
      (data) => {
        const isValidIncrement = (data.hours * 2) % 1 === 0;
        return isValidIncrement;
      },
      {
        message: validation.hoursIncrementInvalid,
        path: ['hours'],
      },
    )
    .refine(
      (data) => {
        if (data.hours >= 0) {
          return !!data.reason && data.reason.trim().length > 0;
        }
        return true;
      },
      {
        message: validation.reasonRequired,
        path: ['reason'],
      },
    );
};

// ============================================================================
// ORIGINAL COMBINED SCHEMA (for backward compatibility with edit flow)
// ============================================================================

export const createOvertimeSubmissionSchema = (validation: {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  dateRequired: string;
  hoursMinRange: string;
  hoursMaxRange: string;
  dateRangeInvalid: string;
  hoursIncrementInvalid: string;
  reasonRequired: string;
  futureDateNotAllowedForPositive: string;
  futureDateTooFar: string;
}) => {
  return z
    .object({
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
    })
    .superRefine((data, ctx) => {
      if (!data.date) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setHours(23, 59, 59, 999);
      thirtyDaysAhead.setDate(today.getDate() + 30);

      if (data.hours >= 0) {
        // Positive hours: last 7 days to today only
        if (data.date < sevenDaysAgo || data.date > endOfToday) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.futureDateNotAllowedForPositive,
            path: ['date'],
          });
        }
      } else {
        // Negative hours: last 7 days to 30 days ahead
        if (data.date < sevenDaysAgo || data.date > thirtyDaysAhead) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.futureDateTooFar,
            path: ['date'],
          });
        }
      }
    })
    .refine(
      (data) => {
        const isValidIncrement = (data.hours * 2) % 1 === 0;
        return isValidIncrement;
      },
      {
        message: validation.hoursIncrementInvalid,
        path: ['hours'],
      },
    )
    .refine(
      (data) => {
        if (data.hours >= 0) {
          return !!data.reason && data.reason.trim().length > 0;
        }
        return true;
      },
      {
        message: validation.reasonRequired,
        path: ['reason'],
      },
    );
};

// ============================================================================
// PAYOUT REQUEST SCHEMA
// ============================================================================

export const createPayoutRequestSchema = (validation: {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  hoursMinRange: string;
  hoursIncrementInvalid: string;
  reasonRequired: string;
}) => {
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
    .refine(
      (data) => {
        const isValidIncrement = (data.hours * 2) % 1 === 0;
        return isValidIncrement;
      },
      {
        message: validation.hoursIncrementInvalid,
        path: ['hours'],
      },
    );
};
