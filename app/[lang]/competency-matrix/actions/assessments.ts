'use server';

import { ObjectId } from 'mongodb';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createAssessmentSchema } from '../lib/zod';
import { COLLECTIONS } from '../lib/constants';
import { computeAssessmentMetrics } from '../lib/calculations';
import type { CompetencyRating, RequiredCompetency } from '../lib/types';
import { canApproveAssessments } from '../lib/permissions';
import {
  requireAuth,
  revalidateCompetencyMatrix,
} from './utils';

export async function saveAssessmentDraft(
  data: unknown,
  lang: Locale,
): Promise<{ success: string; id?: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userEmail = session.user!.email as string;

  const dict = await getDictionary(lang);
  const schema = createAssessmentSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.assessments);
    const now = new Date();
    const validated = result.data;

    // Check for existing draft
    const existing = await coll.findOne({
      employeeIdentifier: validated.employeeIdentifier,
      evaluationPeriodId: validated.evaluationPeriodId,
      assessmentType: validated.assessmentType,
      assessorEmail: userEmail,
      status: 'draft',
    });

    // Get position requirements for metric calculations
    const positionsColl = await dbc(COLLECTIONS.positions);
    const position = await positionsColl.findOne({
      _id: new ObjectId(validated.positionId),
    });
    const requirements: RequiredCompetency[] =
      position?.requiredCompetencies ?? [];

    const metrics = computeAssessmentMetrics(
      validated.ratings as CompetencyRating[],
      requirements,
    );

    if (existing) {
      await coll.updateOne(
        { _id: existing._id },
        {
          $set: {
            ratings: validated.ratings,
            ...metrics,
            updatedAt: now,
          },
        },
      );
      revalidateCompetencyMatrix();
      return { success: 'draft_saved', id: existing._id.toString() };
    }

    const res = await coll.insertOne({
      ...validated,
      ...metrics,
      assessorEmail: userEmail,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });

    revalidateCompetencyMatrix();
    return { success: 'draft_saved', id: res.insertedId.toString() };
  } catch (error) {
    console.error('saveAssessmentDraft error:', error);
    return { error: 'server' };
  }
}

export async function submitAssessment(
  assessmentId: string,
): Promise<{ success: string } | { error: string }> {
  const session = await requireAuth();
  const userEmail = session.user!.email as string;

  try {
    const coll = await dbc(COLLECTIONS.assessments);
    const assessment = await coll.findOne({
      _id: new ObjectId(assessmentId),
    });

    if (!assessment) return { error: 'notFound' };
    if (assessment.assessorEmail !== userEmail) return { error: 'unauthorized' };
    if (assessment.status !== 'draft') return { error: 'already_submitted' };

    // Recalculate metrics at submission time
    const positionsColl = await dbc(COLLECTIONS.positions);
    const position = await positionsColl.findOne({
      _id: new ObjectId(assessment.positionId),
    });
    const requirements: RequiredCompetency[] =
      position?.requiredCompetencies ?? [];

    const metrics = computeAssessmentMetrics(
      assessment.ratings as CompetencyRating[],
      requirements,
    );

    await coll.updateOne(
      { _id: new ObjectId(assessmentId) },
      {
        $set: {
          ...metrics,
          status: 'submitted',
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    revalidateCompetencyMatrix();
    return { success: 'submitted' };
  } catch (error) {
    console.error('submitAssessment error:', error);
    return { error: 'server' };
  }
}

export async function approveAssessment(
  assessmentId: string,
): Promise<{ success: string } | { error: string }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canApproveAssessments(userRoles)) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc(COLLECTIONS.assessments);
    const assessment = await coll.findOne({
      _id: new ObjectId(assessmentId),
    });

    if (!assessment) return { error: 'notFound' };
    if (assessment.status !== 'submitted') return { error: 'not_submitted' };

    await coll.updateOne(
      { _id: new ObjectId(assessmentId) },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: session.user!.email as string,
          updatedAt: new Date(),
        },
      },
    );

    revalidateCompetencyMatrix();
    return { success: 'approved' };
  } catch (error) {
    console.error('approveAssessment error:', error);
    return { error: 'server' };
  }
}
