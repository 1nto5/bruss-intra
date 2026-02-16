/**
 * Serializes assignment records from MongoDB documents,
 * handling both the legacy (employee directly on record) and
 * current (assignment.type discriminated union) structures.
 *
 * Converts ObjectId _id fields to strings to avoid
 * Next.js serialization errors when passing to client components.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoDoc = Record<string, any>;

function serializeAssignmentTarget(record: MongoDoc): MongoDoc | undefined {
  const assignment = record.assignment as MongoDoc | undefined;
  const legacyEmployee = record.employee as MongoDoc | undefined;

  if (assignment) {
    if (assignment.type === 'employee') {
      return {
        type: 'employee' as const,
        employee: { ...assignment.employee, _id: assignment.employee._id?.toString() },
      };
    }
    return assignment;
  }

  if (legacyEmployee) {
    return {
      type: 'employee' as const,
      employee: { ...legacyEmployee, _id: legacyEmployee._id?.toString() },
    };
  }

  return undefined;
}

export function serializeAssignment(
  currentAssignment: MongoDoc | null | undefined,
): MongoDoc | undefined {
  if (!currentAssignment) return undefined;

  const assignment = serializeAssignmentTarget(currentAssignment);
  const { employee: _employee, ...rest } = currentAssignment;
  return { ...rest, assignment };
}

export function serializeAssignmentHistory(
  history: MongoDoc[] | undefined,
): MongoDoc[] {
  return (history ?? []).map((record) => {
    const assignment = serializeAssignmentTarget(record);
    const { employee: _employee, ...rest } = record;
    return { ...rest, assignment };
  });
}
