export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { COLLECTIONS } from '../../lib/constants';
import { isHrOrAdmin, isManager } from '../../lib/permissions';
import { findTeamMembers } from '../../actions/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MatchBadge } from '../../components/shared/match-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmployeeTableFiltering } from './components/table-filtering';

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
  const hrAdmin = isHrOrAdmin(userRoles);
  const mgr = isManager(userRoles);

  const employeesColl = await dbc(COLLECTIONS.employees);
  const assessmentsColl = await dbc(COLLECTIONS.assessments);

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
    employeeFilter = { identifier: selfEmp?.identifier || '__none__' };
  }

  // Save role-based filter before applying URL filters (used for department options)
  const roleFilter = JSON.parse(JSON.stringify(employeeFilter));

  // Apply URL-based filters
  const nameParam =
    typeof resolvedSearchParams.name === 'string'
      ? resolvedSearchParams.name
      : undefined;
  if (nameParam) {
    const searchOr = [
      { firstName: { $regex: nameParam, $options: 'i' } },
      { lastName: { $regex: nameParam, $options: 'i' } },
      { identifier: { $regex: nameParam, $options: 'i' } },
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
    typeof resolvedSearchParams.department === 'string'
      ? resolvedSearchParams.department
      : undefined;
  if (deptParam) {
    const departments = deptParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (departments.length > 0) {
      employeeFilter.department = { $in: departments };
    }
  }

  const contractParam =
    typeof resolvedSearchParams.contract === 'string'
      ? resolvedSearchParams.contract
      : undefined;
  if (contractParam) {
    const contracts = contractParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (contracts.length === 1) {
      if (contracts[0] === 'permanent') {
        employeeFilter.endDate = null;
      } else if (contracts[0] === 'fixed-term') {
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

  // Get latest assessment match % for each employee
  const identifiers = employees.map((e) => e.identifier);
  const latestAssessments = await assessmentsColl
    .aggregate([
      {
        $match: {
          employeeIdentifier: { $in: identifiers },
          assessmentType: 'supervisor',
          status: 'approved',
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$employeeIdentifier',
          matchPercentage: { $first: '$overallMatchPercentage' },
          assessedAt: { $first: '$submittedAt' },
        },
      },
    ])
    .toArray();

  const matchMap = new Map(
    latestAssessments.map((a) => [
      a._id,
      { matchPercentage: a.matchPercentage, assessedAt: a.assessedAt },
    ]),
  );

  // Get unique departments for filter options (using role-based filter, before URL filters)
  const allDepts = await employeesColl.distinct('department', roleFilter);
  const departmentOptions = (allDepts as string[])
    .filter(Boolean)
    .sort()
    .map((d) => ({ value: d, label: d }));

  const fetchTime = new Date();

  return (
    <Card>
      <CardHeader>
        <EmployeeTableFiltering
          dict={dict}
          departmentOptions={departmentOptions}
          fetchTime={fetchTime}
        />
      </CardHeader>
      <Separator />
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.employees.name}</TableHead>
              <TableHead>{dict.employees.identifier}</TableHead>
              <TableHead>{dict.employees.position}</TableHead>
              <TableHead>{dict.employees.department}</TableHead>
              <TableHead>{dict.employees.matchPercentage}</TableHead>
              <TableHead>{dict.employees.endDate}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
              employees.map((emp) => {
                const assessment = matchMap.get(emp.identifier);
                return (
                  <TableRow key={emp._id.toString()}>
                    <TableCell>
                      <Link
                        href={`/${lang}/competency-matrix/employees/${emp.identifier}`}
                        className="font-medium hover:underline"
                      >
                        {emp.firstName} {emp.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{emp.identifier}</TableCell>
                    <TableCell>{emp.position || '-'}</TableCell>
                    <TableCell>{emp.department || '-'}</TableCell>
                    <TableCell>
                      {assessment ? (
                        <MatchBadge
                          matchPercentage={assessment.matchPercentage}
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.endDate ? (
                        <Badge variant="outline" size="sm">
                          {dict.employees.fixedTerm}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {dict.employees.permanent}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
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
