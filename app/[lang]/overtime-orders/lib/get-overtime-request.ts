'use server';

import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import { cookies } from 'next/headers';
import { overtimeRequestEmployeeType, OvertimeType } from './types';

export async function getOvertimeRequest(
  lang: string,
  id: string,
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  overtimeRequestLocaleString: OvertimeType;
}> {
  const cookieStore = await cookies();
  const res = await fetch(
    `${process.env.API}/overtime-orders/request?id=${id}`,
    {
      next: { revalidate: 0, tags: ['overtime-orders-request'] },
      headers: { cookie: cookieStore.toString() },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getOvertimeRequest error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  const overtimeRequest = await res.json();

  // Handle data from legacy format (employees) or new format (employeesWithScheduledDayOff)
  let employeesWithScheduledDayOff: overtimeRequestEmployeeType[] = [];

  if (
    overtimeRequest.employeesWithScheduledDayOff &&
    Array.isArray(overtimeRequest.employeesWithScheduledDayOff)
  ) {
    // New format - transform each employee to include localized agreedReceivingAt
    employeesWithScheduledDayOff =
      overtimeRequest.employeesWithScheduledDayOff.map(
        (employee: overtimeRequestEmployeeType) => ({
          ...employee,
          agreedReceivingAtLocaleString: employee.agreedReceivingAt
            ? formatDate(employee.agreedReceivingAt)
            : null,
        }),
      );
  } else if (
    overtimeRequest.employees &&
    Array.isArray(overtimeRequest.employees)
  ) {
    // Legacy format - copy from employees array
    employeesWithScheduledDayOff = overtimeRequest.employees.map(
      (employee: overtimeRequestEmployeeType) => ({
        ...employee,
        agreedReceivingAtLocaleString: employee.agreedReceivingAt
          ? formatDate(employee.agreedReceivingAt)
          : null,
      }),
    );
  }

  const overtimeRequestLocaleString = {
    ...overtimeRequest,
    // Ensure we have the numberOfEmployees field
    numberOfEmployees:
      overtimeRequest.numberOfEmployees ||
      (Array.isArray(overtimeRequest.employees)
        ? overtimeRequest.employees.length
        : 0),
    // Ensure we have the numberOfShifts field for backward compatibility
    numberOfShifts: overtimeRequest.numberOfShifts || 1,
    // Set the new employeesWithScheduledDayOff field
    employeesWithScheduledDayOff,
  };

  return { fetchTime, fetchTimeLocaleString, overtimeRequestLocaleString };
}
