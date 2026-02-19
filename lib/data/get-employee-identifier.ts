'use server';

import getEmployees from './get-employees';
import { dbc } from '@/lib/db/mongo';

/**
 * Get employee identifier from BRUSS email
 * Uses cached employees list (8h revalidate via API)
 * Email format: firstName.lastName@bruss-group.com
 */
export async function getEmployeeIdentifierByEmail(
  email: string,
): Promise<string | null> {
  if (!email.toLowerCase().includes('@bruss-group.com')) {
    return null;
  }

  const nameParts = email.split('@')[0].split('.');
  if (nameParts.length < 2) return null;

  const firstName = nameParts[0].toLowerCase();
  const lastName = nameParts[1].toLowerCase();

  const employees = await getEmployees();
  const employee = employees.find(
    (e) =>
      e.firstName.toLowerCase() === firstName &&
      e.lastName.toLowerCase() === lastName,
  );

  return employee?.identifier ?? null;
}

/**
 * Find employee record by BRUSS email using direct DB query.
 * Uses MongoDB collation { locale: 'en', strength: 1 } for case+diacritics
 * insensitive matching (e.g. "lukasz" matches "Łukasz").
 */
export async function findEmployeeByEmail(
  email: string,
): Promise<{ identifier: string; firstName: string; lastName: string } | null> {
  if (!email.toLowerCase().includes('@bruss-group.com')) return null;
  const nameParts = email.split('@')[0].split('.');
  if (nameParts.length < 2) return null;

  const coll = await dbc('employees');
  const doc = await coll.findOne(
    { firstName: nameParts[0], lastName: nameParts[1] },
    {
      projection: { identifier: 1, firstName: 1, lastName: 1 },
      collation: { locale: 'en', strength: 1 },
    },
  );
  if (!doc) return null;
  return {
    identifier: doc.identifier as string,
    firstName: doc.firstName as string,
    lastName: doc.lastName as string,
  };
}
