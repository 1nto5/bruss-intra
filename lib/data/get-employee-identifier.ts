'use server';

import getEmployees from './get-employees';
import { dbc } from '@/lib/db/mongo';
import { stripDiacritics } from '@/lib/utils/name-format';

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

  const firstName = stripDiacritics(nameParts[0]).toLowerCase();
  const lastName = stripDiacritics(nameParts[1]).toLowerCase();

  const employees = await getEmployees();
  const employee = employees.find(
    (e) =>
      stripDiacritics(e.firstName).toLowerCase() === firstName &&
      stripDiacritics(e.lastName).toLowerCase() === lastName,
  );

  return employee?.identifier ?? null;
}

/**
 * Find employee record by BRUSS email using direct DB query.
 * Uses MongoDB collation { locale: 'en', strength: 1 } for case+diacritics
 * insensitive matching (e.g. "lukasz" matches "Łukasz").
 * Handles double-barrelled surnames where email uses only the last part
 * (e.g. "monika.dudek@..." matches "Pietkiewicz-Dudek").
 */
export async function findEmployeeByEmail(
  email: string,
): Promise<{ identifier: string; firstName: string; lastName: string } | null> {
  if (!email.toLowerCase().includes('@bruss-group.com')) return null;
  const nameParts = email.split('@')[0].split('.');
  if (nameParts.length < 2) return null;

  const coll = await dbc('employees');

  // Try exact match first (most common case)
  const doc = await coll.findOne(
    { firstName: nameParts[0], lastName: nameParts[1] },
    {
      projection: { identifier: 1, firstName: 1, lastName: 1 },
      collation: { locale: 'en', strength: 1 },
    },
  );
  if (doc) {
    return {
      identifier: doc.identifier as string,
      firstName: doc.firstName as string,
      lastName: doc.lastName as string,
    };
  }

  // Fallback: match double-barrelled surnames where email lastName is a suffix
  // e.g. email "dudek" matches lastName "Pietkiewicz-Dudek"
  const escaped = nameParts[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffixDoc = await coll.findOne(
    {
      firstName: nameParts[0],
      lastName: { $regex: new RegExp(`[-\\s]${escaped}$`, 'i') },
    },
    {
      projection: { identifier: 1, firstName: 1, lastName: 1 },
      collation: { locale: 'en', strength: 1 },
    },
  );
  if (!suffixDoc) return null;
  return {
    identifier: suffixDoc.identifier as string,
    firstName: suffixDoc.firstName as string,
    lastName: suffixDoc.lastName as string,
  };
}
