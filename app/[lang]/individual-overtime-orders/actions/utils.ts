'use server';

import {
  individualOvertimeOrderApprovalNotification,
  individualOvertimeOrderCreationNotification,
  individualOvertimeOrderRejectionNotification,
} from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { dbc } from '@/lib/db/mongo';
import { getNextSequenceValue } from '@/lib/db/counter';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Revalidate individual overtime orders cache
 */
export async function revalidateOrders() {
  revalidateTag('individual-overtime-orders', { expire: 0 });
}

/**
 * Revalidate individual overtime order cache
 */
export async function revalidateOrder() {
  revalidateTag('individual-overtime-order', { expire: 0 });
}

/**
 * Redirect to individual overtime orders list
 */
export async function redirectToOrders(lang: string) {
  redirect(`/${lang}/individual-overtime-orders`);
}

/**
 * Redirect to specific individual overtime order details
 */
export async function redirectToOrder(id: string, lang: string) {
  redirect(`/${lang}/individual-overtime-orders/${id}`);
}

/**
 * Generate next sequential internal ID for individual overtime order
 * Format: "number/YY" (e.g., "123/25")
 * Uses atomic counter for race-condition-safe ID generation.
 * @internal
 */
export async function generateNextInternalId(): Promise<string> {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const seq = await getNextSequenceValue('individual_overtime_orders', year);
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
  payment: boolean,
  scheduledDayOff?: Date | null,
  workStartTime?: Date | null,
  workEndTime?: Date | null,
  hours?: number,
) {
  const { subject, html } = individualOvertimeOrderRejectionNotification({
    requestUrl: `${process.env.BASE_URL}/pl/individual-overtime-orders/${id}`,
    reason: rejectionReason,
    payment,
    scheduledDayOff,
    workStartTime,
    workEndTime,
    hours,
  });
  await mailer({ to: email, subject, html });
}

/**
 * Send approval notification email to employee (Polish)
 * @param approvalType - 'supervisor' for first stage, 'final' for final approval
 * @internal
 */
export async function sendApprovalEmailToEmployee(
  email: string,
  id: string,
  approvalType: 'supervisor' | 'final' = 'final',
  payment: boolean = false,
  approverName: string,
  scheduledDayOff?: Date | null,
  workStartTime?: Date | null,
  workEndTime?: Date | null,
  hours?: number,
) {
  const { subject, html } = individualOvertimeOrderApprovalNotification({
    requestUrl: `${process.env.BASE_URL}/pl/individual-overtime-orders/${id}`,
    stage: approvalType,
    payment,
    approverName,
    scheduledDayOff,
    workStartTime,
    workEndTime,
    hours,
  });
  await mailer({ to: email, subject, html });
}

/**
 * Check if a user is the latest supervisor for an employee
 * Used for extended approval permissions when manager changes
 * @returns true if userEmail is the supervisor of the most recent order by employeeEmail
 */
export async function checkIfLatestSupervisor(
  userEmail: string,
  employeeEmail: string,
): Promise<boolean> {
  try {
    const coll = await dbc('individual_overtime_orders');
    const latestOrder = await coll.findOne(
      { submittedBy: employeeEmail },
      { sort: { submittedAt: -1 }, projection: { supervisor: 1 } },
    );
    return latestOrder?.supervisor === userEmail;
  } catch (error) {
    console.error('checkIfLatestSupervisor error:', error);
    return false;
  }
}

/**
 * Send creation notification email to employee (Polish)
 * @internal
 */
export async function sendCreationEmailToEmployee(
  email: string,
  id: string,
  payment: boolean,
  creatorName?: string,
  scheduledDayOff?: Date | null,
  workStartTime?: Date | null,
  workEndTime?: Date | null,
  hours?: number,
) {
  const { subject, html } = individualOvertimeOrderCreationNotification({
    requestUrl: `${process.env.BASE_URL}/pl/individual-overtime-orders/${id}`,
    payment,
    creatorName,
    scheduledDayOff,
    workStartTime,
    workEndTime,
    hours,
  });
  await mailer({ to: email, subject, html });
}
