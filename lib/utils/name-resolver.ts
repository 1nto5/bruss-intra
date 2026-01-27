import { dbc } from '@/lib/db/mongo';
import { extractNameFromEmail } from './name-format';

type NameInput = {
  email: string;
  identifier?: string;
};

/**
 * Resolve display name for a single user
 * - If identifier provided, lookup in employees
 * - If non-domain email, lookup in employees by email
 * - Otherwise, parse from email
 */
export async function resolveDisplayName(
  email: string,
  identifier?: string,
): Promise<string> {
  if (!email || email === 'system-cron') return 'System';

  // Domain users - parse email
  if (email.toLowerCase().includes('@bruss-group.com')) {
    return extractNameFromEmail(email);
  }

  // External users - lookup in employees
  try {
    const employeesCollection = await dbc('employees');

    const query = identifier
      ? { identifier }
      : { email: email.toLowerCase() };

    const employee = await employeesCollection.findOne(query, {
      projection: { firstName: 1, lastName: 1 },
    });

    if (employee?.firstName && employee?.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
  } catch (error) {
    console.error('Name resolver error:', error);
  }

  // Fallback to email parsing
  return extractNameFromEmail(email);
}

/**
 * Batch resolve display names for multiple users
 * Returns a Map<email|identifier, displayName>
 */
export async function resolveDisplayNames(
  inputs: NameInput[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Separate domain vs external
  const domainUsers: NameInput[] = [];
  const externalUsers: NameInput[] = [];

  for (const input of inputs) {
    if (!input.email || input.email === 'system-cron') {
      result.set(input.identifier || input.email || '', 'System');
      continue;
    }
    if (input.email.toLowerCase().includes('@bruss-group.com')) {
      domainUsers.push(input);
    } else {
      externalUsers.push(input);
    }
  }

  // Domain users - parse emails
  for (const user of domainUsers) {
    result.set(user.email, extractNameFromEmail(user.email));
  }

  // External users - batch lookup
  if (externalUsers.length > 0) {
    try {
      const employeesCollection = await dbc('employees');

      // Collect identifiers and emails for lookup
      const identifiers = externalUsers
        .filter((u) => u.identifier)
        .map((u) => u.identifier!);
      const emails = externalUsers
        .filter((u) => !u.identifier)
        .map((u) => u.email.toLowerCase());

      const orConditions: Record<string, unknown>[] = [];
      if (identifiers.length > 0) {
        orConditions.push({ identifier: { $in: identifiers } });
      }
      if (emails.length > 0) {
        orConditions.push({ email: { $in: emails } });
      }

      if (orConditions.length > 0) {
        const employees = await employeesCollection
          .find({ $or: orConditions })
          .project({ identifier: 1, email: 1, firstName: 1, lastName: 1 })
          .toArray();

        // Build lookup maps
        const byIdentifier = new Map(
          employees
            .filter((e) => e.identifier && e.firstName && e.lastName)
            .map((e) => [e.identifier, `${e.firstName} ${e.lastName}`]),
        );
        const byEmail = new Map(
          employees
            .filter((e) => e.email && e.firstName && e.lastName)
            .map((e) => [e.email?.toLowerCase(), `${e.firstName} ${e.lastName}`]),
        );

        // Resolve each external user
        for (const user of externalUsers) {
          const key = user.identifier || user.email;
          const name = user.identifier
            ? byIdentifier.get(user.identifier)
            : byEmail.get(user.email.toLowerCase());

          result.set(key, name || extractNameFromEmail(user.email));
        }
      } else {
        // No lookups needed, fallback all
        for (const user of externalUsers) {
          result.set(
            user.identifier || user.email,
            extractNameFromEmail(user.email),
          );
        }
      }
    } catch (error) {
      console.error('Batch name resolver error:', error);
      // Fallback for all external users
      for (const user of externalUsers) {
        result.set(
          user.identifier || user.email,
          extractNameFromEmail(user.email),
        );
      }
    }
  }

  return result;
}

/**
 * Batch resolve employee names from identifiers
 * Returns a Map<identifier, displayName>
 */
export async function resolveEmployeeNames(
  identifiers: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  if (identifiers.length === 0) {
    return result;
  }

  try {
    const employeesCollection = await dbc('employees');
    const employees = await employeesCollection
      .find({ identifier: { $in: identifiers } })
      .project({ identifier: 1, firstName: 1, lastName: 1 })
      .toArray();

    for (const emp of employees) {
      if (emp.identifier && emp.firstName && emp.lastName) {
        result.set(emp.identifier, `${emp.firstName.charAt(0)}. ${emp.lastName}`);
      }
    }
  } catch (error) {
    console.error('resolveEmployeeNames error:', error);
  }

  return result;
}
