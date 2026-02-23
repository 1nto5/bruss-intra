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
import { MatchBadge } from '../../components/shared/match-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function AssessmentsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/assessments`);
  }

  const userRoles = session.user.roles ?? [];
  const userEmail = session.user.email;
  const hrAdmin = isHrOrAdmin(userRoles);
  const mgr = isManager(userRoles);

  const [assessmentsColl, employeesColl, periodsColl] = await Promise.all([
    dbc(COLLECTIONS.assessments),
    dbc(COLLECTIONS.employees),
    dbc(COLLECTIONS.evaluationPeriods),
  ]);

  // Build filter based on role
  let assessmentFilter: Record<string, unknown> = {};

  if (hrAdmin) {
    // See all
  } else if (mgr) {
    const teamMembers = await findTeamMembers(userEmail);
    const teamIdentifiers = teamMembers.map((m) => m.identifier);
    // See own assessments + team assessments
    assessmentFilter = {
      $or: [
        { assessorEmail: userEmail },
        { employeeIdentifier: { $in: teamIdentifiers } },
      ],
    };
    // Also include self
    const selfEmp = await employeesColl.findOne({
      email: userEmail.toLowerCase(),
    });
    if (selfEmp) {
      (assessmentFilter.$or as Record<string, unknown>[]).push({
        employeeIdentifier: selfEmp.identifier,
      });
    }
  } else {
    // Regular users see only their own
    const selfEmp = await employeesColl.findOne({
      email: userEmail.toLowerCase(),
    });
    assessmentFilter = {
      employeeIdentifier: selfEmp?.identifier || '__none__',
    };
  }

  const assessments = await assessmentsColl
    .find(assessmentFilter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  // Resolve employee names
  const identifiers = [
    ...new Set(assessments.map((a) => a.employeeIdentifier)),
  ];
  const employees = await employeesColl
    .find({ identifier: { $in: identifiers } })
    .project({ identifier: 1, firstName: 1, lastName: 1 })
    .toArray();
  const empMap = new Map(
    employees.map((e) => [
      e.identifier,
      `${e.firstName} ${e.lastName}`,
    ]),
  );

  // Resolve period names
  const { ObjectId } = await import('mongodb');
  const periodIds = [
    ...new Set(assessments.map((a) => a.evaluationPeriodId)),
  ];
  const periods = await periodsColl
    .find({
      _id: { $in: periodIds.filter(Boolean).map((id) => new ObjectId(id)) },
    })
    .toArray();
  const periodMap = new Map(
    periods.map((p) => [p._id.toString(), p.name]),
  );

  return (
    <Card>
      <CardHeader className="md:hidden">
        <CardTitle>{dict.assessments.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.assessments.employee}</TableHead>
                <TableHead>{dict.assessments.evaluationPeriod}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>{dict.assessments.status}</TableHead>
                <TableHead>{dict.assessments.matchPercentage}</TableHead>
                <TableHead>{dict.assessments.gapCount}</TableHead>
                <TableHead>{dict.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length > 0 ? (
                assessments.map((a) => (
                  <TableRow key={a._id.toString()}>
                    <TableCell>
                      <Link
                        href={`/${lang}/competency-matrix/employees/${a.employeeIdentifier}`}
                        className="hover:underline"
                      >
                        {empMap.get(a.employeeIdentifier) ||
                          a.employeeIdentifier}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {periodMap.get(a.evaluationPeriodId) || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.assessmentType === 'self'
                            ? 'outline'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {a.assessmentType === 'self'
                          ? dict.assessments.selfAssessment
                          : dict.assessments.supervisorAssessment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === 'approved'
                            ? 'statusApproved'
                            : a.status === 'submitted'
                              ? 'statusPending'
                              : 'statusDraft'
                        }
                      >
                        {dict.status[a.status as keyof typeof dict.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.overallMatchPercentage != null ? (
                        <MatchBadge
                          matchPercentage={a.overallMatchPercentage}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{a.gapCount ?? '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/${lang}/competency-matrix/assessments/${a._id}`}
                        >
                          {dict.details}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
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
