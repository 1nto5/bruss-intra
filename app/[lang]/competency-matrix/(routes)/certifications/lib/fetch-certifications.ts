import { dbc } from "@/lib/db/mongo";
import { COLLECTIONS } from "../../../lib/constants";
import type {
  CertificationStatus,
  CertificationTableRow,
} from "../../../lib/types";

interface CertificationFilters {
  status?: string;
  type?: string;
  employee?: string;
}

export async function fetchCertifications(
  filters: CertificationFilters,
): Promise<CertificationTableRow[]> {
  const [certsColl, employeesColl] = await Promise.all([
    dbc(COLLECTIONS.employeeCertifications),
    dbc(COLLECTIONS.employees),
  ]);

  // Build MongoDB query for cert type filter
  const query: Record<string, unknown> = {};
  if (filters.type) {
    const types = filters.type
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (types.length > 0) {
      query.certificationType = { $in: types };
    }
  }

  const certifications = await certsColl
    .find(query)
    .sort({ expirationDate: 1 })
    .toArray();

  // Get employee names
  const identifiers = [
    ...new Set(certifications.map((c) => c.employeeIdentifier)),
  ];
  const employees = await employeesColl
    .find({ identifier: { $in: identifiers } })
    .project({ identifier: 1, firstName: 1, lastName: 1 })
    .toArray();
  const empMap = new Map(
    employees.map((e) => [e.identifier, `${e.firstName} ${e.lastName}`]),
  );

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Parse status filters
  const statusFilters = filters.status
    ? filters.status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Map certifications to table rows with computed status
  let rows: CertificationTableRow[] = certifications.map((cert) => {
    const expDate = cert.expirationDate ? new Date(cert.expirationDate) : null;

    let status: CertificationStatus;
    let daysLeft: number | null = null;

    if (!expDate) {
      status = "no-expiration";
    } else if (expDate < now) {
      status = "expired";
      daysLeft = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    } else if (expDate <= thirtyDaysFromNow) {
      status = "expiring";
      daysLeft = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      status = "valid";
      daysLeft = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return {
      _id: cert._id.toString(),
      employeeIdentifier: cert.employeeIdentifier,
      employeeName:
        empMap.get(cert.employeeIdentifier) || cert.employeeIdentifier,
      certificationType: cert.certificationType as string,
      issuedDate: cert.issuedDate
        ? new Date(cert.issuedDate).toISOString()
        : "",
      expirationDate: expDate ? expDate.toISOString() : null,
      status,
      daysLeft,
      documentRef: cert.documentRef as string | undefined,
      notes: cert.notes as string | undefined,
    };
  });

  // Apply status filter
  if (statusFilters.length > 0) {
    rows = rows.filter((r) => statusFilters.includes(r.status));
  }

  // Apply employee name filter (case-insensitive substring match)
  if (filters.employee) {
    const search = filters.employee.toLowerCase();
    rows = rows.filter((r) => r.employeeName.toLowerCase().includes(search));
  }

  return rows;
}
