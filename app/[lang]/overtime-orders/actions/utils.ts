'use server';

import { overtimeOrderApprovalNotification } from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { getNextSequenceValue } from '@/lib/db/counter';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function revalidateOvertimeOrders() {
  revalidateTag('overtime-orders', { expire: 0 });
}

export async function revalidateOvertimeOrdersRequest() {
  revalidateTag('overtime-orders-request', { expire: 0 });
}

// Helper function to generate the next internal ID using atomic counter
export async function generateNextInternalId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const shortYear = currentYear.toString().slice(-2);
  const nextNumber = await getNextSequenceValue('overtime_orders', currentYear);
  return `${nextNumber}/${shortYear}`;
}

export async function redirectToOvertimeOrders(lang: string) {
  redirect(`/${lang}/overtime-orders`);
}

export async function redirectToOvertimeOrdersDaysOff(id: string, lang: string) {
  redirect(`/${lang}/overtime-orders/${id}/pickups`);
}

export async function sendEmailNotificationToRequestor(
  email: string,
  id: string,
  approverName: string,
  orderData?: {
    workStartTime?: Date | null;
    workEndTime?: Date | null;
    hours?: number;
    payment?: boolean;
    scheduledDayOff?: Date | null;
  },
) {
  const { subject, html } = overtimeOrderApprovalNotification({
    requestUrl: `${process.env.BASE_URL}/pl/overtime-orders/${id}`,
    approverName,
    workStartTime: orderData?.workStartTime,
    workEndTime: orderData?.workEndTime,
    hours: orderData?.hours,
    payment: orderData?.payment,
    scheduledDayOff: orderData?.scheduledDayOff,
  });
  await mailer({ to: email, subject, html });
}
