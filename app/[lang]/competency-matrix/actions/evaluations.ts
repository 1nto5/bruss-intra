'use server';

import { ObjectId } from 'mongodb';
import { dbc } from '@/lib/db/mongo';
import { COLLECTIONS } from '../lib/constants';
import {
  hasFullAccess,
  canSupervisorAssess,
} from '../lib/permissions';
import { requireAuth, revalidateCompetencyMatrix } from './utils';
import {
  computeEvaluationResults,
  buildEmptyRatings,
} from '../lib/evaluation-calculations';
import { createEvaluationSchema } from '../lib/zod';
import type { EvaluationDocType, EvaluationCause } from '../lib/types';

type ActionResult =
  | { success: true; id?: string }
  | { error: string; issues?: { message: string; path: (string | number | symbol)[] }[] };

// ── Create Evaluation ───────────────────────────────────────────────
export async function createEvaluation(
  data: {
    employeeIdentifier: string;
    periodFrom: string;
    periodTo: string;
    cause: string;
    recentTrainings: string[];
    evaluationPeriodId?: string;
  },
  lang: string,
): Promise<ActionResult> {
  const session = await requireAuth(`/${lang}/competency-matrix/evaluations`);
  const userRoles = session.user.roles ?? [];
  const userEmail = session.user.email!;

  if (!canSupervisorAssess(userRoles) && !hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  // Zod validation
  const schema = createEvaluationSchema({
    nameRequired: '',
    processAreaRequired: '',
    levelDescriptionRequired: '',
    departmentRequired: '',
    requiredLevelInvalid: '',
    weightInvalid: '',
    periodNameRequired: '',
    periodTypeRequired: '',
    startDateRequired: '',
    endDateRequired: '',
    endDateAfterStart: '',
    certTypeRequired: '',
    issuedDateRequired: '',
    ratingInvalid: '',
    atLeastOneRating: '',
    slugRequired: '',
    slugFormat: '',
    employeeRequired: 'Employee is required',
    evaluationPeriodRequired: 'Evaluation period is required',
    evaluationCauseRequired: 'Evaluation cause is required',
    evaluationRatingInvalid: '',
    recommendationRequired: '',
  });
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      error: 'validation',
      issues: parsed.error.issues.map((i) => ({
        message: i.message,
        path: i.path,
      })),
    };
  }

  const employeesColl = await dbc(COLLECTIONS.employees);
  const evaluationsColl = await dbc(COLLECTIONS.evaluations);

  // Get employee data
  const employee = await employeesColl.findOne({
    identifier: data.employeeIdentifier,
  });
  if (!employee) return { error: 'notFound' };

  // Get assessor (current user) data
  const assessor = await employeesColl.findOne({
    email: userEmail.toLowerCase(),
  });

  // Get previous evaluation for this employee (if any)
  const previousEval = await evaluationsColl.findOne(
    { employeeIdentifier: data.employeeIdentifier, status: 'approved' },
    { sort: { createdAt: -1 } },
  );

  const now = new Date();
  const emptyRatings = buildEmptyRatings();
  const { sectionTotals, selfTotalPoints, supervisorTotalPoints, grade, isPositive } =
    computeEvaluationResults(emptyRatings);

  const doc: Omit<EvaluationDocType, '_id'> = {
    employeeIdentifier: data.employeeIdentifier,
    employeeEmail: employee.email || undefined,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeePosition: employee.position || '',
    employeeDepartment: employee.department || '',
    employeeHireDate: employee.hireDate || now,
    employeePositionStartDate: employee.positionStartDate || undefined,
    assessorEmail: userEmail,
    assessorName: assessor
      ? `${assessor.firstName} ${assessor.lastName}`
      : userEmail,
    assessorPosition: assessor?.position || '',
    assessorDepartment: assessor?.department || '',
    previousEvaluation: previousEval
      ? { totalMark: previousEval.grade, date: previousEval.createdAt }
      : undefined,
    periodFrom: new Date(data.periodFrom),
    periodTo: new Date(data.periodTo),
    cause: data.cause as EvaluationCause,
    recentTrainings: data.recentTrainings.filter(Boolean).slice(0, 5),
    evaluationPeriodId: data.evaluationPeriodId,
    ratings: emptyRatings,
    sectionTotals,
    selfTotalPoints,
    supervisorTotalPoints,
    grade,
    isPositive,
    recommendation: 'keep-position',
    selfAssessmentStatus: 'pending',
    supervisorAssessmentStatus: 'pending',
    status: 'draft',
    createdBy: userEmail,
    createdAt: now,
    updatedAt: now,
  };

  const result = await evaluationsColl.insertOne(doc);
  await revalidateCompetencyMatrix();

  return { success: true, id: result.insertedId.toString() };
}

// ── Save Self-Assessment Ratings ────────────────────────────────────
export async function saveEvaluationSelfRatings(
  evaluationId: string,
  ratings: { criterionKey: string; rating: number | null }[],
): Promise<ActionResult> {
  const session = await requireAuth();
  const userEmail = session.user.email!;
  const userRoles = session.user.roles ?? [];

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(evaluationId),
  });

  if (!evaluation) return { error: 'notFound' };
  if (evaluation.status !== 'draft') return { error: 'unauthorized' };

  // Ownership check: only the employee (or a supervisor/admin) can save self-ratings
  const isOwner = evaluation.employeeEmail?.toLowerCase() === userEmail.toLowerCase();
  if (!isOwner && !canSupervisorAssess(userRoles) && !hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  // Update self-assessment ratings
  const updatedRatings = evaluation.ratings.map(
    (r: { criterionKey: string; selfRating: number | null; supervisorRating: number | null }) => {
      const incoming = ratings.find((ir) => ir.criterionKey === r.criterionKey);
      return incoming
        ? { ...r, selfRating: incoming.rating }
        : r;
    },
  );

  const { sectionTotals, selfTotalPoints, supervisorTotalPoints, grade, isPositive } =
    computeEvaluationResults(updatedRatings);

  const allSelfRated = updatedRatings.every(
    (r: { selfRating: number | null }) => r.selfRating !== null,
  );

  await evaluationsColl.updateOne(
    { _id: new ObjectId(evaluationId) },
    {
      $set: {
        ratings: updatedRatings,
        sectionTotals,
        selfTotalPoints,
        supervisorTotalPoints,
        grade,
        isPositive,
        selfAssessmentStatus: allSelfRated ? 'completed' : 'pending',
        selfAssessmentCompletedBy: allSelfRated ? userEmail : undefined,
        updatedAt: new Date(),
      },
    },
  );

  await revalidateCompetencyMatrix();
  return { success: true };
}

// ── Save Supervisor Ratings + Part C + Part D ───────────────────────
export async function saveEvaluationSupervisorRatings(
  evaluationId: string,
  data: {
    ratings: { criterionKey: string; rating: number | null }[];
    assessorRemarks?: string;
    employeeRemarks?: string;
    recommendation: string;
    recommendationDetails?: string;
  },
): Promise<ActionResult> {
  const session = await requireAuth();
  const userRoles = session.user.roles ?? [];

  if (!canSupervisorAssess(userRoles) && !hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(evaluationId),
  });

  if (!evaluation) return { error: 'notFound' };
  if (evaluation.status !== 'draft') return { error: 'unauthorized' };

  // Update supervisor ratings
  const updatedRatings = evaluation.ratings.map(
    (r: { criterionKey: string; selfRating: number | null; supervisorRating: number | null }) => {
      const incoming = data.ratings.find(
        (ir) => ir.criterionKey === r.criterionKey,
      );
      return incoming
        ? { ...r, supervisorRating: incoming.rating }
        : r;
    },
  );

  const { sectionTotals, selfTotalPoints, supervisorTotalPoints, grade, isPositive } =
    computeEvaluationResults(updatedRatings);

  const allSupervisorRated = updatedRatings.every(
    (r: { supervisorRating: number | null }) => r.supervisorRating !== null,
  );

  await evaluationsColl.updateOne(
    { _id: new ObjectId(evaluationId) },
    {
      $set: {
        ratings: updatedRatings,
        sectionTotals,
        selfTotalPoints,
        supervisorTotalPoints,
        grade,
        isPositive,
        supervisorAssessmentStatus: allSupervisorRated
          ? 'completed'
          : 'pending',
        assessorRemarks: data.assessorRemarks || undefined,
        employeeRemarks: data.employeeRemarks || undefined,
        recommendation: data.recommendation,
        recommendationDetails: data.recommendationDetails || undefined,
        updatedAt: new Date(),
      },
    },
  );

  await revalidateCompetencyMatrix();
  return { success: true };
}

// ── Save Full Evaluation (self + supervisor + remarks + recommendation) ──
export async function saveFullEvaluation(
  evaluationId: string,
  data: {
    selfRatings: { criterionKey: string; rating: number | null }[];
    supervisorRatings: { criterionKey: string; rating: number | null }[];
    assessorRemarks?: string;
    employeeRemarks?: string;
    recommendation: string;
    recommendationDetails?: string;
  },
): Promise<ActionResult> {
  const session = await requireAuth();
  const userRoles = session.user.roles ?? [];
  const userEmail = session.user.email!;

  if (!canSupervisorAssess(userRoles) && !hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(evaluationId),
  });

  if (!evaluation) return { error: 'notFound' };
  if (evaluation.status !== 'draft') return { error: 'unauthorized' };

  // Merge both self and supervisor ratings
  const updatedRatings = evaluation.ratings.map(
    (r: { criterionKey: string; selfRating: number | null; supervisorRating: number | null }) => {
      const selfIncoming = data.selfRatings.find(
        (ir) => ir.criterionKey === r.criterionKey,
      );
      const supervisorIncoming = data.supervisorRatings.find(
        (ir) => ir.criterionKey === r.criterionKey,
      );
      return {
        ...r,
        selfRating: selfIncoming ? selfIncoming.rating : r.selfRating,
        supervisorRating: supervisorIncoming
          ? supervisorIncoming.rating
          : r.supervisorRating,
      };
    },
  );

  const { sectionTotals, selfTotalPoints, supervisorTotalPoints, grade, isPositive } =
    computeEvaluationResults(updatedRatings);

  const allSelfRated = updatedRatings.every(
    (r: { selfRating: number | null }) => r.selfRating !== null,
  );
  const allSupervisorRated = updatedRatings.every(
    (r: { supervisorRating: number | null }) => r.supervisorRating !== null,
  );

  await evaluationsColl.updateOne(
    { _id: new ObjectId(evaluationId) },
    {
      $set: {
        ratings: updatedRatings,
        sectionTotals,
        selfTotalPoints,
        supervisorTotalPoints,
        grade,
        isPositive,
        selfAssessmentStatus: allSelfRated ? 'completed' : 'pending',
        selfAssessmentCompletedBy: allSelfRated ? userEmail : undefined,
        supervisorAssessmentStatus: allSupervisorRated
          ? 'completed'
          : 'pending',
        assessorRemarks: data.assessorRemarks || undefined,
        employeeRemarks: data.employeeRemarks || undefined,
        recommendation: data.recommendation,
        recommendationDetails: data.recommendationDetails || undefined,
        updatedAt: new Date(),
      },
    },
  );

  await revalidateCompetencyMatrix();
  return { success: true };
}

// ── Submit Evaluation ───────────────────────────────────────────────
export async function submitEvaluation(
  evaluationId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const userRoles = session.user.roles ?? [];

  if (!canSupervisorAssess(userRoles) && !hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(evaluationId),
  });

  if (!evaluation) return { error: 'notFound' };
  if (evaluation.status !== 'draft') return { error: 'unauthorized' };

  await evaluationsColl.updateOne(
    { _id: new ObjectId(evaluationId) },
    {
      $set: {
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  await revalidateCompetencyMatrix();
  return { success: true };
}

// ── Approve Evaluation ──────────────────────────────────────────────
export async function approveEvaluation(
  evaluationId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const userRoles = session.user.roles ?? [];
  const userEmail = session.user.email!;

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(evaluationId),
  });

  if (!evaluation) return { error: 'notFound' };
  if (evaluation.status !== 'submitted') return { error: 'unauthorized' };

  await evaluationsColl.updateOne(
    { _id: new ObjectId(evaluationId) },
    {
      $set: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: userEmail,
        updatedAt: new Date(),
      },
    },
  );

  await revalidateCompetencyMatrix();
  return { success: true };
}
