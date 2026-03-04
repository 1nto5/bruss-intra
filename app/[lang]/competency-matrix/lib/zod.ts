import * as z from 'zod';
import { PROCESS_AREAS, EDUCATION_LEVELS, EXPERIENCE_LEVELS } from './types';
import { EVALUATION_CAUSES, EVALUATION_RECOMMENDATIONS } from './constants';

type ValidationMessages = {
  nameRequired: string;
  processAreaRequired: string;
  levelDescriptionRequired: string;
  departmentRequired: string;
  requiredLevelInvalid: string;
  weightInvalid: string;
  periodNameRequired: string;
  periodTypeRequired: string;
  startDateRequired: string;
  endDateRequired: string;
  endDateAfterStart: string;
  certTypeRequired: string;
  issuedDateRequired: string;
  ratingInvalid: string;
  atLeastOneRating: string;
  slugRequired: string;
  slugFormat: string;
  employeeRequired: string;
  evaluationPeriodRequired: string;
  evaluationCauseRequired: string;
  evaluationRatingInvalid: string;
  recommendationRequired: string;
};

// ── i18n string schema (pl required, de/en optional) ─────────────────
const i18nStringRequired = (msg: string) =>
  z.object({
    pl: z.string().min(1, { message: msg }),
    de: z.string().optional(),
    en: z.string().optional(),
  });

const i18nStringOptional = () =>
  z
    .object({
      pl: z.string().optional(),
      de: z.string().optional(),
      en: z.string().optional(),
    })
    .optional();

// ── Competency ───────────────────────────────────────────────────────
export function createCompetencySchema(v: ValidationMessages) {
  return z.object({
    name: i18nStringRequired(v.nameRequired),
    description: i18nStringOptional(),
    processArea: z.enum(PROCESS_AREAS, {
      message: v.processAreaRequired,
    }),
    levels: z.object({
      1: i18nStringRequired(v.levelDescriptionRequired),
      2: i18nStringRequired(v.levelDescriptionRequired),
      3: i18nStringRequired(v.levelDescriptionRequired),
    }),
    trainingRecommendation: i18nStringOptional(),
    helpText: i18nStringOptional(),
    active: z.boolean().default(true),
  });
}

// ── Position ─────────────────────────────────────────────────────────
export function createPositionSchema(v: ValidationMessages) {
  return z.object({
    name: i18nStringRequired(v.nameRequired),
    department: z.string().min(1, { message: v.departmentRequired }),
    requiredCompetencies: z.array(
      z.object({
        competencyId: z.string().min(1),
        requiredLevel: z
          .number()
          .int()
          .min(1, { message: v.requiredLevelInvalid })
          .max(3, { message: v.requiredLevelInvalid }),
        weight: z
          .number()
          .int()
          .min(1, { message: v.weightInvalid })
          .max(3, { message: v.weightInvalid }),
      }),
    ),
    requiredExperience: z.enum(EXPERIENCE_LEVELS).default('none'),
    requiredEducation: z.enum(EDUCATION_LEVELS).default('none'),
    requiredCertifications: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  });
}

// ── Evaluation Period ────────────────────────────────────────────────
export function createEvaluationPeriodSchema(v: ValidationMessages) {
  return z
    .object({
      name: z.string().min(1, { message: v.periodNameRequired }),
      type: z.enum(
        ['annual', 'pre-hire', 'probation-2m', 'probation-5m', 'contract-end'],
        { message: v.periodTypeRequired },
      ),
      startDate: z.coerce.date({ message: v.startDateRequired }),
      endDate: z.coerce.date({ message: v.endDateRequired }),
      employeeIdentifiers: z.array(z.string()).default([]),
    })
    .refine((data) => data.endDate > data.startDate, {
      message: v.endDateAfterStart,
      path: ['endDate'],
    });
}

// ── Certificate Type (config management) ────────────────────────────
export function createCertTypeSchema(v: ValidationMessages) {
  return z.object({
    slug: z
      .string()
      .min(1, { message: v.slugRequired })
      .regex(/^[a-z0-9-]+$/, { message: v.slugFormat }),
    name: i18nStringRequired(v.nameRequired),
  });
}

// ── Employee Certification ───────────────────────────────────────────
export function createCertificationSchema(v: ValidationMessages) {
  return z.object({
    employeeIdentifier: z.string().min(1),
    certificationType: z.string().min(1, { message: v.certTypeRequired }),
    issuedDate: z.coerce.date({ message: v.issuedDateRequired }),
    expirationDate: z.coerce.date().optional(),
    documentRef: z.string().optional(),
    notes: z.string().optional(),
  });
}

// ── Employee Ratings (competency ratings per employee) ──────────────
export function createEmployeeRatingsSchema(v: ValidationMessages) {
  return z.object({
    employeeIdentifier: z.string().min(1, { message: v.employeeRequired }),
    ratings: z
      .array(
        z.object({
          competencyId: z.string().min(1),
          rating: z
            .number()
            .int()
            .min(1, { message: v.ratingInvalid })
            .max(3, { message: v.ratingInvalid })
            .nullable(),
        }),
      )
      .min(1, { message: v.atLeastOneRating }),
  });
}

// ── Evaluation (Performance Review) ─────────────────────────────────
export function createEvaluationSchema(v: ValidationMessages) {
  return z.object({
    employeeIdentifier: z.string().min(1),
    periodFrom: z.coerce.date({ message: v.evaluationPeriodRequired }),
    periodTo: z.coerce.date({ message: v.evaluationPeriodRequired }),
    cause: z.enum(EVALUATION_CAUSES, {
      message: v.evaluationCauseRequired,
    }),
    recentTrainings: z.array(z.string()).default([]),
    evaluationPeriodId: z.string().optional(),
  });
}

export function createEvaluationRatingsSchema(v: ValidationMessages) {
  return z.object({
    ratings: z.array(
      z.object({
        criterionKey: z.string().min(1),
        rating: z
          .number()
          .int()
          .min(1, { message: v.evaluationRatingInvalid })
          .max(5, { message: v.evaluationRatingInvalid })
          .nullable(),
      }),
    ),
  });
}

export function createEvaluationSupervisorSchema(v: ValidationMessages) {
  return z.object({
    ratings: z.array(
      z.object({
        criterionKey: z.string().min(1),
        rating: z
          .number()
          .int()
          .min(1, { message: v.evaluationRatingInvalid })
          .max(5, { message: v.evaluationRatingInvalid })
          .nullable(),
      }),
    ),
    assessorRemarks: z.string().optional(),
    recommendation: z.enum(EVALUATION_RECOMMENDATIONS, {
      message: v.recommendationRequired,
    }),
    recommendationDetails: z.string().optional(),
  });
}

// ── Full Evaluation Form (Create + Supervisor Edit) ──────────────────
export function createFullEvaluationSchema(v: ValidationMessages) {
  return z
    .object({
      // Part A - create fields
      employeeIdentifier: z.string().min(1, { message: v.employeeRequired }),
      periodFrom: z.coerce.date({ message: v.evaluationPeriodRequired }),
      periodTo: z.coerce.date({ message: v.evaluationPeriodRequired }),
      cause: z.enum(EVALUATION_CAUSES, {
        message: v.evaluationCauseRequired,
      }),
      recentTrainings: z.array(z.string()).default([]),
      evaluationPeriodId: z.string().optional(),
      // Part C - remarks (supervisor edit)
      assessorRemarks: z.string().optional(),
      employeeRemarks: z.string().optional(),
      // Part D - recommendation (supervisor edit)
      recommendation: z.enum(EVALUATION_RECOMMENDATIONS, {
        message: v.recommendationRequired,
      }),
      recommendationDetails: z.string().optional(),
    })
    .refine((data) => data.periodTo > data.periodFrom, {
      message: v.endDateAfterStart,
      path: ['periodTo'],
    });
}
