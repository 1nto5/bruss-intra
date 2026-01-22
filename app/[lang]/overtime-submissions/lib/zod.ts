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
  previousMonthNotAllowed: string;
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
    .refine(
      (data) => {
        if (!data.date) return true;
        const now = new Date();
        const selectedDate = new Date(data.date);

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();

        if (
          selectedYear < currentYear ||
          (selectedYear === currentYear && selectedMonth < currentMonth)
        ) {
          return false;
        }

        return true;
      },
      {
        message: validation.previousMonthNotAllowed,
        path: ['date'],
      },
    )
    .refine(
      (data) => {
        if (!data.date) return true;

        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const startOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );
        startOfCurrentMonth.setHours(0, 0, 0, 0);

        const threeDaysBeforeMonth = new Date(startOfCurrentMonth);
        threeDaysBeforeMonth.setDate(startOfCurrentMonth.getDate() - 3);

        const minAllowedDate =
          sevenDaysAgo > threeDaysBeforeMonth
            ? sevenDaysAgo
            : threeDaysBeforeMonth;

        return data.date >= minAllowedDate && data.date <= now;
      },
      {
        message: validation.dateRangeInvalid,
        path: ['date'],
      },
    )
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
  previousMonthNotAllowed: string;
  dateRangeInvalid: string;
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
    .refine(
      (data) => {
        if (!data.date) return true;
        const now = new Date();
        const selectedDate = new Date(data.date);

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();

        if (
          selectedYear < currentYear ||
          (selectedYear === currentYear && selectedMonth < currentMonth)
        ) {
          return false;
        }

        return true;
      },
      {
        message: validation.previousMonthNotAllowed,
        path: ['date'],
      },
    )
    .refine(
      (data) => {
        if (!data.date) return true;

        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const startOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );
        startOfCurrentMonth.setHours(0, 0, 0, 0);

        const threeDaysBeforeMonth = new Date(startOfCurrentMonth);
        threeDaysBeforeMonth.setDate(startOfCurrentMonth.getDate() - 3);

        const minAllowedDate =
          sevenDaysAgo > threeDaysBeforeMonth
            ? sevenDaysAgo
            : threeDaysBeforeMonth;

        return data.date >= minAllowedDate && data.date <= now;
      },
      {
        message: validation.dateRangeInvalid,
        path: ['date'],
      },
    )
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
  previousMonthNotAllowed: string;
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
    .refine(
      (data) => {
        if (!data.date) return true;
        const now = new Date();
        const selectedDate = new Date(data.date);

        // Check if selected date is from previous month
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();

        // If year is earlier OR (same year but month is earlier) = previous month
        if (
          selectedYear < currentYear ||
          (selectedYear === currentYear && selectedMonth < currentMonth)
        ) {
          return false; // Cannot add overtime from previous month
        }

        return true;
      },
      {
        message: validation.previousMonthNotAllowed,
        path: ['date'],
      },
    )
    .refine(
      (data) => {
        if (!data.date) {
          return true; // Will be caught by dateRequired validation
        }

        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const effectiveDate = new Date(data.date);
        effectiveDate.setHours(0, 0, 0, 0);

        const threeDaysAgo = new Date();
        threeDaysAgo.setHours(0, 0, 0, 0);
        threeDaysAgo.setDate(now.getDate() - 3);

        const startOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );
        startOfCurrentMonth.setHours(0, 0, 0, 0);

        if (data.hours < 0) {
          // Overtime pickup: any time after now
          return effectiveDate > now;
        } else {
          // Adding overtime: within last 3 days (+ today = 4 days total) BUT only from current month
          // Effective start date is the later of: (3 days ago) or (start of current month)
          const effectiveStartDate =
            threeDaysAgo > startOfCurrentMonth
              ? threeDaysAgo
              : startOfCurrentMonth;
          return effectiveDate >= effectiveStartDate && effectiveDate <= now;
        }
      },
      {
        message: validation.dateRangeInvalid,
        path: ['date'],
      },
    )
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
