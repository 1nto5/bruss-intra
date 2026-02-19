'use server';

import { revalidateTag } from 'next/cache';
import { dbc } from '@/lib/db/mongo';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { COLLECTIONS } from '../lib/constants';

// ── Revalidation ─────────────────────────────────────────────────────
export async function revalidateCompetencyMatrix() {
  revalidateTag('competency-matrix', { expire: 0 });
}

// ── Auth guard — returns session or redirects ────────────────────────
export async function requireAuth(callbackPath = '/competency-matrix') {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(`/auth?callbackUrl=${callbackPath}`);
  }
  return session;
}

// ── Supervisor lookup ────────────────────────────────────────────────
// The `manager` field in employees is a name string (e.g., "Michał Dudziak"),
// not an email. We need to resolve it to an employee record to get email/identifier.
export async function findSupervisorByName(
  managerName: string,
): Promise<{ email: string; identifier: string } | null> {
  if (!managerName) return null;

  const coll = await dbc(COLLECTIONS.employees);
  const parts = managerName.trim().split(/\s+/);

  if (parts.length < 2) return null;

  // Try "firstName lastName" and "lastName firstName"
  const [a, ...rest] = parts;
  const b = rest.join(' ');

  const employee = await coll.findOne({
    $or: [
      { firstName: a, lastName: b },
      { firstName: b, lastName: a },
    ],
  });

  if (employee) {
    return {
      email: employee.email ?? '',
      identifier: employee.identifier ?? '',
    };
  }

  return null;
}

// ── Find employees managed by a given email ──────────────────────────
export async function findTeamMembers(supervisorEmail: string) {
  const coll = await dbc(COLLECTIONS.employees);

  // First, find the supervisor's name
  const supervisor = await coll.findOne({
    email: supervisorEmail.toLowerCase(),
  });

  if (!supervisor) return [];

  const fullName1 = `${supervisor.firstName} ${supervisor.lastName}`;
  const fullName2 = `${supervisor.lastName} ${supervisor.firstName}`;

  // Find all employees whose manager field matches
  return coll
    .find({
      $or: [{ manager: fullName1 }, { manager: fullName2 }],
    })
    .toArray();
}
