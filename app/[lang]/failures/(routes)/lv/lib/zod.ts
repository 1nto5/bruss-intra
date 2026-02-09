import * as z from 'zod';

export const createAddFailureSchema = (validation: {
  lineRequired: string;
  supervisorRequired: string;
  responsibleRequired: string;
  stationRequired: string;
  failureRequired: string;
  fromDateFuture: string;
  fromDatePast: string;
}) => {
  return z
    .object({
      line: z.string({ message: validation.lineRequired }),
      station: z.string(),
      failure: z.string(),
      from: z.date(),
      supervisor: z.string().min(1, { message: validation.supervisorRequired }),
      responsible: z.string().min(1, { message: validation.responsibleRequired }),
      solution: z.string().optional(),
      comment: z.string().optional(),
    })
    .refine((data) => data.from < new Date(), {
      path: ['from'],
      message: validation.fromDateFuture,
    })
    .refine((data) => data.from >= new Date(Date.now() - 3600 * 1000), {
      path: ['from'],
      message: validation.fromDatePast,
    })
    .refine((data) => !!data.station, {
      path: ['station'],
      message: validation.stationRequired,
    })
    .refine((data) => !!data.failure && data.station, {
      path: ['failure'],
      message: validation.failureRequired,
    });
};

export const createUpdateFailureSchema = (validation: {
  supervisorRequired: string;
  responsibleRequired: string;
  fromDateEditLimit: string;
  toDateFuture: string;
  toDateBeforeFrom: string;
}) => {
  return z
    .object({
      _id: z.string(),
      from: z.date(),
      to: z.date(),
      supervisor: z.string().min(1, { message: validation.supervisorRequired }),
      responsible: z
        .string()
        .min(1, { message: validation.responsibleRequired }),
      solution: z.string().optional(),
      comment: z.string().optional(),
    })
    .refine((data) => data.from >= new Date(Date.now() - 8 * 3600 * 1000), {
      path: ['from'],
      message: validation.fromDateEditLimit,
    })
    .refine((data) => data.to < new Date(), {
      path: ['to'],
      message: validation.toDateFuture,
    })
    .refine((data) => data.to >= data.from, {
      path: ['to'],
      message: validation.toDateBeforeFrom,
    });
};

// Derive type from factory — used by types.ts
const _addSchema = createAddFailureSchema({
  lineRequired: '',
  supervisorRequired: '',
  responsibleRequired: '',
  stationRequired: '',
  failureRequired: '',
  fromDateFuture: '',
  fromDatePast: '',
});
export type FailureZodType = z.infer<typeof _addSchema>;
