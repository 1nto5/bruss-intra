'use server';

import {
  overtimeSubmissionApprovalNotification,
  overtimeSubmissionRejectionNotification,
  overtimeSubmissionCorrectionNotification,
} from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { dbc } from '@/lib/db/mongo';
import { getNextSequenceValue } from '@/lib/db/counter';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Revalidate overtime submissions cache
 */
export async function revalidateOvertime() {
  revalidateTag('overtime-submissions', { expire: 0 });
}

/**
 * Revalidate individual overtime submission cache
 */
export async function revalidateOvertimeSubmission() {
  revalidateTag('overtime-submission', { expire: 0 });
}

/**
 * Redirect to overtime submissions list
 */
export async function redirectToOvertime(lang: string) {
  redirect(`/${lang}/overtime-submissions`);
}

/**
 * Redirect to specific overtime submission details
 */
export async function redirectToOvertimeSubmission(id: string, lang: string) {
  redirect(`/${lang}/overtime-submissions/${id}`);
}

/**
 * Generate next sequential internal ID for overtime submission
 * Format: "number/YY" (e.g., "123/25")
 * Uses atomic counter for race-condition-safe ID generation.
 * @internal
 */
export async function generateNextInternalId(): Promise<string> {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const seq = await getNextSequenceValue('overtime_submissions', year);
  return `${seq}/${shortYear}`;
}

/**
 * Send rejection notification email to employee (Polish)
 * @internal
 */
export async function sendRejectionEmailToEmployee(
  email: string,
  id: string,
  rejectionReason: string | undefined,
  hours?: number,
  date?: Date | null,
) {
  const { subject, html } = overtimeSubmissionRejectionNotification({
    requestUrl: `${process.env.BASE_URL}/pl/overtime-submissions/${id}`,
    reason: rejectionReason,
    hours,
    date,
  });
  await mailer({ to: email, subject, html });
}

/**
 * Send approval notification email to employee (Polish)
 * @internal
 * @param approvalType - 'final' for final approval, 'supervisor' for first-stage approval (awaiting Plant Manager)
 */
export async function sendApprovalEmailToEmployee(
  email: string,
  id: string,
  approvalType: 'final' | 'supervisor' = 'final',
  hours?: number,
  date?: Date | null,
) {
  const { subject, html } = overtimeSubmissionApprovalNotification({
    requestUrl: `${process.env.BASE_URL}/pl/overtime-submissions/${id}`,
    stage: approvalType,
    hours,
    date,
  });
  await mailer({ to: email, subject, html });
}

/**
 * Check if a user is the latest supervisor for an employee
 * Used for extended approval permissions when manager changes
 * @returns true if userEmail is the supervisor of the most recent submission by employeeEmail
 */
export async function checkIfLatestSupervisor(
  userEmail: string,
  employeeEmail: string,
): Promise<boolean> {
  try {
    const coll = await dbc('overtime_submissions');
    const latestSubmission = await coll.findOne(
      { submittedBy: employeeEmail },
      { sort: { submittedAt: -1 }, projection: { supervisor: 1 } },
    );
    return latestSubmission?.supervisor === userEmail;
  } catch (error) {
    console.error('checkIfLatestSupervisor error:', error);
    return false;
  }
}

/**
 * Send correction notification email to employee (Polish)
 * Sent when someone other than the author corrects the submission
 * @internal
 */
export async function sendCorrectionEmailToEmployee(
  employeeEmail: string,
  id: string,
  correctorEmail: string,
  reason: string,
  changes: Record<string, { from: any; to: any }>,
  statusChanged?: { from: string; to: string },
  hours?: number,
  date?: Date,
) {
  const { subject, html } = overtimeSubmissionCorrectionNotification({
    requestUrl: `${process.env.BASE_URL}/pl/overtime-submissions/${id}`,
    correctorEmail,
    reason,
    changes,
    statusChanged,
    hours,
    date: date ?? null,
  });
  await mailer({ to: employeeEmail, subject, html });
}
