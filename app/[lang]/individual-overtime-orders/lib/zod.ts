import * as z from 'zod';

// Schema for creating new individual overtime orders
export const createOrderSchema = (validation: {
  hoursMinRange: string;
  hoursMaxRange: string;
  hoursIncrementInvalid: string;
  timeIncrementInvalid?: string;
  scheduledDayOffRequired: string;
  workStartTimeRequired?: string;
  workEndTimeRequired?: string;
  workEndTimeBeforeStart?: string;
  durationMax24h?: string;
  durationMin1h?: string;
}) => {
  return z
    .object({
      hours: z
        .number()
        .min(0, { message: validation.hoursMinRange })
        .max(16, { message: validation.hoursMaxRange }),
      reason: z.string().optional(),
      payment: z.boolean().optional(),
      scheduledDayOff: z.date().optional(),
      workStartTime: z.date(),
      workEndTime: z.date(),
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
        // workStartTime must be in 30-minute increments
        if (data.workStartTime) {
          const minutes = data.workStartTime.getMinutes();
          return minutes === 0 || minutes === 30;
        }
        return true;
      },
      {
        message:
          validation.timeIncrementInvalid ??
          'Time must be in 30-minute increments (:00 or :30)!',
        path: ['workStartTime'],
      },
    )
    .refine(
      (data) => {
        // workEndTime must be in 30-minute increments
        if (data.workEndTime) {
          const minutes = data.workEndTime.getMinutes();
          return minutes === 0 || minutes === 30;
        }
        return true;
      },
      {
        message:
          validation.timeIncrementInvalid ??
          'Time must be in 30-minute increments (:00 or :30)!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (data.workStartTime && data.workEndTime) {
          return data.workEndTime > data.workStartTime;
        }
        return true;
      },
      {
        message:
          validation.workEndTimeBeforeStart ||
          'Work end time must be after work start time!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (data.workStartTime && data.workEndTime) {
          const durationMs =
            data.workEndTime.getTime() - data.workStartTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          return durationHours >= 1;
        }
        return true;
      },
      {
        message:
          validation.durationMin1h || 'Work duration must be at least 1 hour!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (data.workStartTime && data.workEndTime) {
          const durationMs =
            data.workEndTime.getTime() - data.workStartTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          return durationHours <= 24;
        }
        return true;
      },
      {
        message:
          validation.durationMax24h || 'Work duration cannot exceed 24 hours!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (!data.payment) {
          return !!data.scheduledDayOff;
        }
        return true;
      },
      {
        message: validation.scheduledDayOffRequired,
        path: ['scheduledDayOff'],
      },
    );
};

// Schema for correcting individual overtime orders (no date/time restrictions)
export const createOrderCorrectionSchema = (validation: {
  supervisorEmailInvalid: string;
  supervisorRequired: string;
  hoursMinRange: string;
  hoursMaxRange: string;
  hoursIncrementInvalid: string;
  timeIncrementInvalid?: string;
  scheduledDayOffRequired: string;
  workStartTimeRequired?: string;
  workEndTimeRequired?: string;
  workEndTimeBeforeStart?: string;
  durationMax24h?: string;
  durationMin1h?: string;
}) => {
  return z
    .object({
      supervisor: z
        .string()
        .email({ message: validation.supervisorEmailInvalid })
        .nonempty({ message: validation.supervisorRequired }),
      hours: z
        .number()
        .min(0, { message: validation.hoursMinRange })
        .max(16, { message: validation.hoursMaxRange }),
      reason: z.string().optional(),
      payment: z.boolean().optional(),
      scheduledDayOff: z.date().optional(),
      workStartTime: z.date(),
      workEndTime: z.date(),
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
        // workStartTime must be in 30-minute increments
        if (data.workStartTime) {
          const minutes = data.workStartTime.getMinutes();
          return minutes === 0 || minutes === 30;
        }
        return true;
      },
      {
        message:
          validation.timeIncrementInvalid ??
          'Time must be in 30-minute increments (:00 or :30)!',
        path: ['workStartTime'],
      },
    )
    .refine(
      (data) => {
        // workEndTime must be in 30-minute increments
        if (data.workEndTime) {
          const minutes = data.workEndTime.getMinutes();
          return minutes === 0 || minutes === 30;
        }
        return true;
      },
      {
        message:
          validation.timeIncrementInvalid ??
          'Time must be in 30-minute increments (:00 or :30)!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (data.workStartTime && data.workEndTime) {
          return data.workEndTime > data.workStartTime;
        }
        return true;
      },
      {
        message:
          validation.workEndTimeBeforeStart ||
          'Work end time must be after work start time!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (data.workStartTime && data.workEndTime) {
          const durationMs =
            data.workEndTime.getTime() - data.workStartTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          return durationHours >= 1;
        }
        return true;
      },
      {
        message:
          validation.durationMin1h || 'Work duration must be at least 1 hour!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (data.workStartTime && data.workEndTime) {
          const durationMs =
            data.workEndTime.getTime() - data.workStartTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          return durationHours <= 24;
        }
        return true;
      },
      {
        message:
          validation.durationMax24h || 'Work duration cannot exceed 24 hours!',
        path: ['workEndTime'],
      },
    )
    .refine(
      (data) => {
        if (!data.payment) {
          return !!data.scheduledDayOff;
        }
        return true;
      },
      {
        message: validation.scheduledDayOffRequired,
        path: ['scheduledDayOff'],
      },
    );
};
