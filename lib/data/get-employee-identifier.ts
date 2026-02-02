'use server';

import getEmployees from './get-employees';

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
