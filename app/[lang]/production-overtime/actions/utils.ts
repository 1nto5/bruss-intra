'use server';

import { overtimeOrderApprovalNotification } from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function revalidateProductionOvertime() {
  revalidateTag('production-overtime', { expire: 0 });
}

export async function revalidateProductionOvertimeRequest() {
  revalidateTag('production-overtime-request', { expire: 0 });
}

export async function redirectToProductionOvertime(lang: string) {
  redirect(`/${lang}/production-overtime`);
}

export async function redirectToProductionOvertimeDaysOff(
  id: string,
  lang: string,
) {
  redirect(`/${lang}/production-overtime/${id}`);
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
    requestUrl: `${process.env.BASE_URL}/production-overtime/${id}`,
    approverName,
    workStartTime: orderData?.workStartTime,
    workEndTime: orderData?.workEndTime,
    hours: orderData?.hours,
    payment: orderData?.payment,
    scheduledDayOff: orderData?.scheduledDayOff,
  });
  await mailer({ to: email, subject, html });
}
