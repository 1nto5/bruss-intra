'use server';

import { overtimeOrderApprovalNotification } from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { dbc } from '@/lib/db/mongo';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function revalidateOvertimeOrders() {
  revalidateTag('overtime-orders', { expire: 0 });
}

export async function revalidateOvertimeOrdersRequest() {
  revalidateTag('overtime-orders-request', { expire: 0 });
}

// Helper function to generate the next internal ID
export async function generateNextInternalId(): Promise<string> {
  try {
    const collection = await dbc('overtime_orders');
    const currentYear = new Date().getFullYear();
    const shortYear = currentYear.toString().slice(-2);

    // Regex to match and extract the numeric part of IDs like "123/25"
    const yearRegex = new RegExp(`^(\\d+)\\/${shortYear}$`);

    // Fetch all overtime internalIds for the current year.
    // We only need the internalId field for this operation.
    const overtimeThisYear = await collection
      .find(
        { internalId: { $regex: `\\/${shortYear}$` } }, // Filter for IDs ending with "/YY"
        { projection: { internalId: 1 } }, // Only fetch the internalId field
      )
      .toArray();

    let maxNumber = 0;
    for (const doc of overtimeThisYear) {
      if (doc.internalId) {
        const match = doc.internalId.match(yearRegex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `${nextNumber}/${shortYear}`;
  } catch (error) {
    console.error('Failed to generate internal ID:', error);
    // Fallback to a timestamp-based ID if there's an error.
    return `${Date.now()}/${new Date().getFullYear().toString().slice(-2)}`;
  }
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
