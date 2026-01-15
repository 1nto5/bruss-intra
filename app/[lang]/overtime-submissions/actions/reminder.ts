'use server';

import { auth } from '@/lib/auth';
import mailer from '@/lib/services/mailer';
import {
  employeeOvertimeReminderNotification,
  supervisorOvertimeNotification,
} from '@/lib/services/email-templates';
import { revalidateTag } from 'next/cache';

const BASE_URL = process.env.BASE_URL || 'https://intra.bruss-group.com';

/**
 * Send a reminder email to an employee about their overtime balance.
 * Available to: supervisors (their employees), HR, admin, plant-manager
 */
export async function sendEmployeeOvertimeReminder(
  employeeEmail: string,
  totalHours: number,
  customNote?: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return { error: 'unauthorized' };
    }

    const userRoles = session.user.roles ?? [];
    const isAdmin = userRoles.includes('admin');
    const isHR = userRoles.includes('hr');
    const isPlantManager = userRoles.includes('plant-manager');
    const isManager = userRoles.some(
      (role: string) =>
        role.toLowerCase().includes('manager') ||
        role.toLowerCase().includes('group-leader'),
    );

    // Only managers, HR, admin, plant-manager can send reminders
    if (!isManager && !isHR && !isAdmin && !isPlantManager) {
      return { error: 'unauthorized' };
    }

    // Generate the URL for the overtime submissions page
    const overtimeUrl = `${BASE_URL}/pl/overtime-submissions`;

    // Polish email for employees
    const { subject, html } = employeeOvertimeReminderNotification({
      employeeEmail,
      totalHours,
      customNote,
      senderEmail: session.user.email,
      balancesUrl: overtimeUrl,
      lang: 'pl',
    });

    await mailer({
      to: employeeEmail,
      subject,
      html,
    });

    revalidateTag('overtime-submissions', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('sendEmployeeOvertimeReminder error:', error);
    return { error: 'Failed to send reminder' };
  }
}

/**
 * Send a notification email to a supervisor about an employee's overtime balance.
 * Available to: HR, admin, plant-manager only
 */
export async function sendSupervisorNotification(
  supervisorEmail: string,
  employeeEmail: string,
  employeeUserId: string,
  totalHours: number,
  customNote?: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return { error: 'unauthorized' };
    }

    const userRoles = session.user.roles ?? [];
    const isAdmin = userRoles.includes('admin');
    const isHR = userRoles.includes('hr');
    const isPlantManager = userRoles.includes('plant-manager');

    // Only HR, admin, plant-manager can notify supervisors
    if (!isHR && !isAdmin && !isPlantManager) {
      return { error: 'unauthorized' };
    }

    // Generate the URL for the balances page
    const balancesUrl = `${BASE_URL}/en/overtime-submissions/balances/${employeeUserId}`;

    // English email for supervisors
    const { subject, html } = supervisorOvertimeNotification({
      supervisorEmail,
      employeeEmail,
      totalHours,
      customNote,
      senderEmail: session.user.email,
      balancesUrl,
      lang: 'en',
    });

    await mailer({
      to: supervisorEmail,
      subject,
      html,
    });

    revalidateTag('overtime-submissions', { expire: 0 });
    return { success: true };
  } catch (error) {
    console.error('sendSupervisorNotification error:', error);
    return { error: 'Failed to send notification' };
  }
}
