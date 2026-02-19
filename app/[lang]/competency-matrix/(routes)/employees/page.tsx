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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default async function EmployeesPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await params;
  const searchParams = await searchParamsPromise;
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

  // Determine which employees are visible
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

  // Search filter
  if (searchParams.search) {
    const s = searchParams.search;
    const searchOr = [
      { firstName: { $regex: s, $options: 'i' } },
      { lastName: { $regex: s, $options: 'i' } },
      { identifier: { $regex: s, $options: 'i' } },
    ];
    if (employeeFilter.identifier) {
      employeeFilter = {
        $and: [{ identifier: employeeFilter.identifier }, { $or: searchOr }],
      };
    } else {
      employeeFilter.$or = searchOr;
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.employees.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
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
        </div>
      </CardContent>
    </Card>
  );
}
