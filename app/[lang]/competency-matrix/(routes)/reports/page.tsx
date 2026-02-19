export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { COLLECTIONS } from '../../lib/constants';
import { localize } from '../../lib/types';
import { isHrOrAdmin, isManager } from '../../lib/permissions';
import { MatchBadge } from '../../components/shared/match-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/reports`);
  }

  const userRoles = session.user.roles ?? [];
  if (!isHrOrAdmin(userRoles) && !isManager(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [assessmentsColl, employeesColl, competenciesColl] = await Promise.all([
    dbc(COLLECTIONS.assessments),
    dbc(COLLECTIONS.employees),
    dbc(COLLECTIONS.competencies),
  ]);

  // Average match by department
  const deptAvg = await assessmentsColl
    .aggregate([
      {
        $match: {
          assessmentType: 'supervisor',
          status: 'approved',
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeIdentifier',
          foreignField: 'identifier',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.department',
          avgMatch: { $avg: '$overallMatchPercentage' },
          count: { $sum: 1 },
          avgGaps: { $avg: '$gapCount' },
        },
      },
      { $sort: { avgMatch: 1 } },
    ])
    .toArray();

  // Top competency gaps
  const gapAnalysis = await assessmentsColl
    .aggregate([
      {
        $match: {
          assessmentType: 'supervisor',
          status: 'approved',
        },
      },
      { $unwind: '$ratings' },
      {
        $lookup: {
          from: 'positions',
          let: { posId: { $toObjectId: '$positionId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$posId'] } } },
            { $unwind: '$requiredCompetencies' },
            {
              $project: {
                competencyId: '$requiredCompetencies.competencyId',
                requiredLevel: '$requiredCompetencies.requiredLevel',
              },
            },
          ],
          as: 'requirements',
        },
      },
      {
        $addFields: {
          requirement: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$requirements',
                  cond: {
                    $eq: [
                      '$$this.competencyId',
                      '$ratings.competencyId',
                    ],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          'requirement.requiredLevel': { $exists: true },
          'ratings.rating': { $ne: null },
        },
      },
      {
        $addFields: {
          gap: {
            $subtract: [
              '$requirement.requiredLevel',
              '$ratings.rating',
            ],
          },
        },
      },
      { $match: { gap: { $gt: 0 } } },
      {
        $group: {
          _id: '$ratings.competencyId',
          avgGap: { $avg: '$gap' },
          affectedCount: { $sum: 1 },
        },
      },
      { $sort: { avgGap: -1 } },
      { $limit: 20 },
    ])
    .toArray();

  // Load competency names for gap analysis
  const { ObjectId } = await import('mongodb');
  const gapCompIds = gapAnalysis.map((g) => new ObjectId(g._id));
  const gapComps = await competenciesColl
    .find({ _id: { $in: gapCompIds } })
    .toArray();
  const compMap = new Map(gapComps.map((c) => [c._id.toString(), c]));

  return (
    <div className="space-y-6">
      {/* Department Average Match */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.reports.avgMatchByDept}</CardTitle>
          <CardDescription>{dict.reports.departmentMap}</CardDescription>
        </CardHeader>
        <CardContent>
          {deptAvg.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.positions.department}</TableHead>
                    <TableHead>{dict.assessments.matchPercentage}</TableHead>
                    <TableHead>{dict.assessments.gapCount}</TableHead>
                    <TableHead>{dict.employees.title}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptAvg.map((dept) => (
                    <TableRow key={dept._id || 'unknown'}>
                      <TableCell className="font-medium">
                        {dept._id || '-'}
                      </TableCell>
                      <TableCell>
                        <MatchBadge
                          matchPercentage={Math.round(dept.avgMatch)}
                        />
                      </TableCell>
                      <TableCell>{Math.round(dept.avgGaps * 10) / 10}</TableCell>
                      <TableCell>{dept.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{dict.noData}</p>
          )}
        </CardContent>
      </Card>

      {/* Top Competency Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.reports.topGaps}</CardTitle>
          <CardDescription>{dict.reports.gapAnalysis}</CardDescription>
        </CardHeader>
        <CardContent>
          {gapAnalysis.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.reports.competency}</TableHead>
                    <TableHead>{dict.reports.avgGap}</TableHead>
                    <TableHead>{dict.reports.affectedEmployees}</TableHead>
                    <TableHead>{dict.reports.recommendedTraining}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gapAnalysis.map((gap) => {
                    const comp = compMap.get(gap._id);
                    return (
                      <TableRow key={gap._id}>
                        <TableCell className="font-medium">
                          {comp ? localize(comp.name, safeLang) : gap._id}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          -{Math.round(gap.avgGap * 10) / 10}
                        </TableCell>
                        <TableCell>{gap.affectedCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {comp?.trainingRecommendation
                            ? localize(comp.trainingRecommendation, safeLang)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dict.reports.noGaps}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
