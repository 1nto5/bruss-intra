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
  const rawEmployees: overtimeRequestEmployeeType[] = Array.isArray(
    overtimeRequest.employeesWithScheduledDayOff,
  )
    ? overtimeRequest.employeesWithScheduledDayOff
    : Array.isArray(overtimeRequest.employees)
      ? overtimeRequest.employees
      : [];

  const employeesWithScheduledDayOff = rawEmployees.map(
    (employee: overtimeRequestEmployeeType) => ({
      ...employee,
      agreedReceivingAtLocaleString: employee.agreedReceivingAt
        ? formatDate(employee.agreedReceivingAt)
        : null,
    }),
  );

  const overtimeRequestLocaleString = {
    ...overtimeRequest,
    numberOfEmployees:
      overtimeRequest.numberOfEmployees ||
      (Array.isArray(overtimeRequest.employees)
        ? overtimeRequest.employees.length
        : 0),
    numberOfShifts: overtimeRequest.numberOfShifts || 1,
    employeesWithScheduledDayOff,
  };

  return { fetchTime, fetchTimeLocaleString, overtimeRequestLocaleString };
}
