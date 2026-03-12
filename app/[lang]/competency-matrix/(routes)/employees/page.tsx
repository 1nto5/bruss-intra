import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { formatDate } from "@/lib/utils/date-format";
import { getDictionary } from "../../lib/dict";
import { COLLECTIONS } from "../../lib/constants";
import { hasFullAccess, isManager } from "../../lib/permissions";
import { findTeamMembers } from "../../actions/utils";
import {
  fetchBulkEmployeeRatings,
  fetchPositionRequirements,
  getPositionRequirements,
  computeEmployeeMatch,
} from "../../lib/fetch-employee-ratings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeTableFiltering } from "./components/table-filtering";
import { EmployeeActions } from "./components/employee-actions";

export default async function EmployeesPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const resolvedSearchParams = await searchParamsPromise;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/employees`);
  }

  const userRoles = session.user.roles ?? [];
  const userEmail = session.user.email;
  const hrAdmin = hasFullAccess(userRoles);
  const mgr = isManager(userRoles);
  const canAssess = hrAdmin || mgr;

  // viewMode: admin > manager > employee (priority chain)
  const viewMode = hrAdmin ? "admin" : mgr ? "manager" : "employee";
  const showAllColumns = viewMode !== "employee";

  const employeesColl = await dbc(COLLECTIONS.employees);
  const certsColl = await dbc(COLLECTIONS.employeeCertifications);

  // Determine which employees are visible (role-based access)
  let employeeFilter: Record<string, unknown> = {};

  if (hrAdmin) {
    // HR/Admin see all
  } else if (mgr) {
    // Managers see their team
    const teamMembers = await findTeamMembers(userEmail);
    const teamIdentifiers = teamMembers.map((m) => m.identifier);
    // Also include self
    const selfEmp = await employeesColl.findOne({
      email: userEmail.toLowerCase(),
    });
    if (selfEmp) teamIdentifiers.push(selfEmp.identifier);
    employeeFilter = { identifier: { $in: teamIdentifiers } };
  } else {
    // Regular users see only themselves
    const selfEmp = await employeesColl.findOne({
      email: userEmail.toLowerCase(),
    });
    employeeFilter = { identifier: selfEmp?.identifier || "__none__" };
  }

  // Save role-based filter before applying URL filters (used for department options)
  const roleFilter = JSON.parse(JSON.stringify(employeeFilter));

  // Apply URL-based filters
  const nameParam =
    typeof resolvedSearchParams.name === "string"
      ? resolvedSearchParams.name
      : undefined;
  if (nameParam) {
    const searchOr = [
      { firstName: { $regex: nameParam, $options: "i" } },
      { lastName: { $regex: nameParam, $options: "i" } },
      { identifier: { $regex: nameParam, $options: "i" } },
    ];
    if (employeeFilter.identifier) {
      employeeFilter = {
        $and: [{ identifier: employeeFilter.identifier }, { $or: searchOr }],
      };
    } else {
      employeeFilter.$or = searchOr;
    }
  }

  const deptParam =
    typeof resolvedSearchParams.department === "string"
      ? resolvedSearchParams.department
      : undefined;
  if (deptParam) {
    const departments = deptParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (departments.length > 0) {
      employeeFilter.department = { $in: departments };
    }
  }

  const contractParam =
    typeof resolvedSearchParams.contract === "string"
      ? resolvedSearchParams.contract
      : undefined;
  if (contractParam) {
    const contracts = contractParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (contracts.length === 1) {
      if (contracts[0] === "permanent") {
        employeeFilter.endDate = null;
      } else if (contracts[0] === "fixed-term") {
        employeeFilter.endDate = { $ne: null };
      }
    }
    // If both selected, no filter needed
  }

  const employees = await employeesColl
    .find(employeeFilter)
    .project({
      identifier: 1,
      firstName: 1,
      lastName: 1,
      department: 1,
      position: 1,
      hireDate: 1,
      endDate: 1,
    })
    .sort({ lastName: 1, firstName: 1 })
    .toArray();

  const identifiers = employees.map((e) => e.identifier);

  const certStatusDocs = await certsColl
    .aggregate([
      { $match: { employeeIdentifier: { $in: identifiers } } },
      {
        $addFields: {
          certStatus: {
            $cond: {
              if: { $eq: [{ $type: "$expirationDate" }, "missing"] },
              then: "valid",
              else: {
                $cond: {
                  if: { $lt: ["$expirationDate", new Date()] },
                  then: "expired",
                  else: {
                    $cond: {
                      if: {
                        $lt: [
                          "$expirationDate",
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        ],
                      },
                      then: "expiring",
                      else: "valid",
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$employeeIdentifier",
          expired: {
            $sum: { $cond: [{ $eq: ["$certStatus", "expired"] }, 1, 0] },
          },
          expiring: {
            $sum: { $cond: [{ $eq: ["$certStatus", "expiring"] }, 1, 0] },
          },
          valid: {
            $sum: { $cond: [{ $eq: ["$certStatus", "valid"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const certStatusMap = new Map(
    certStatusDocs.map((c) => [
      c._id,
      {
        expired: c.expired as number,
        expiring: c.expiring as number,
        valid: c.valid as number,
        total: c.total as number,
      },
    ]),
  );

  // Fetch position requirements and employee ratings for Match % column
  const [positionReqMap, ratingsMap] = showAllColumns
    ? await Promise.all([
        fetchPositionRequirements(),
        fetchBulkEmployeeRatings(identifiers),
      ])
    : [new Map(), new Map()];

  // Get unique departments for filter options (skip for employee mode - only 1 row)
  const departmentOptions =
    viewMode !== "employee"
      ? (
          await employeesColl
            .aggregate([
              { $match: roleFilter },
              { $group: { _id: "$department" } },
              { $sort: { _id: 1 } },
            ])
            .toArray()
        )
          .map((d) => d._id as string)
          .filter(Boolean)
          .map((d) => ({ value: d, label: d }))
      : [];

  const now = new Date();
  const fetchTime = new Date();

  // Column count depends on viewMode: admin/manager=8 (with match%), employee=4
  const colCount = showAllColumns ? 8 : 4;

  return (
    <Card>
      {viewMode !== "employee" && (
        <>
          <CardHeader>
            <EmployeeTableFiltering
              dict={dict}
              departmentOptions={departmentOptions}
              fetchTime={fetchTime}
            />
          </CardHeader>
          <Separator />
        </>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.employees.name}</TableHead>
              {showAllColumns && (
                <TableHead>{dict.employees.identifier}</TableHead>
              )}
              <TableHead>{dict.employees.position}</TableHead>
              {showAllColumns && (
                <TableHead>{dict.employees.department}</TableHead>
              )}
              {showAllColumns && (
                <TableHead>{dict.employees.endDate}</TableHead>
              )}
              {showAllColumns && (
                <TableHead>{dict.employees.matchPercent}</TableHead>
              )}
              <TableHead>{dict.employees.certStatus}</TableHead>
              <TableHead>{dict.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
              employees.map((emp) => {
                const certInfo = certStatusMap.get(emp.identifier);
                const endDate = emp.endDate ? new Date(emp.endDate) : null;
                const daysUntil = endDate
                  ? Math.ceil(
                      (endDate.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;

                return (
                  <TableRow key={emp._id.toString()}>
                    <TableCell>
                      <span className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </span>
                    </TableCell>
                    {showAllColumns && <TableCell>{emp.identifier}</TableCell>}
                    <TableCell>{emp.position || "-"}</TableCell>
                    {showAllColumns && (
                      <TableCell>{emp.department || "-"}</TableCell>
                    )}
                    {showAllColumns && (
                      <TableCell>
                        {endDate && daysUntil !== null ? (
                          <Badge
                            variant={
                              daysUntil < 0
                                ? "statusRejected"
                                : daysUntil <= 30
                                  ? "statusOverdue"
                                  : daysUntil <= 90
                                    ? "statusPending"
                                    : "outline"
                            }
                            size="sm"
                          >
                            {formatDate(endDate)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            {dict.employees.permanent}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {showAllColumns && (
                      <TableCell>
                        {(() => {
                          const ratings = ratingsMap.get(emp.identifier);
                          const requirements = getPositionRequirements(
                            positionReqMap,
                            emp.position,
                          );
                          if (
                            !ratings ||
                            !requirements ||
                            requirements.length === 0
                          ) {
                            return (
                              <span className="text-muted-foreground">-</span>
                            );
                          }
                          const { matchPercent, badgeVariant } =
                            computeEmployeeMatch(ratings, requirements);
                          return (
                            <Badge variant={badgeVariant} size="sm">
                              {matchPercent}%
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    )}
                    <TableCell>
                      {certInfo ? (
                        certInfo.expired > 0 ? (
                          <Badge variant="statusRejected" size="sm">
                            {dict.certifications.expired} ({certInfo.expired})
                          </Badge>
                        ) : certInfo.expiring > 0 ? (
                          <Badge variant="statusOverdue" size="sm">
                            {dict.certifications.expiringSoon} (
                            {certInfo.expiring})
                          </Badge>
                        ) : (
                          <Badge variant="statusApproved" size="sm">
                            {dict.certifications.valid}
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <EmployeeActions
                        identifier={emp.identifier}
                        lang={lang}
                        dict={dict}
                        hasFullAccess={hrAdmin}
                        canAssess={canAssess}
                        viewMode={viewMode}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center">
                  {dict.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
