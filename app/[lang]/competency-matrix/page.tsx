export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from './lib/dict';
import { COLLECTIONS } from './lib/constants';
import { isHrOrAdmin } from './lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

async function getDashboardStats(roles: string[], userEmail: string) {
  const [
    competenciesColl,
    positionsColl,
    assessmentsColl,
    employeesColl,
    certsColl,
    periodsColl,
  ] = await Promise.all([
    dbc(COLLECTIONS.competencies),
    dbc(COLLECTIONS.positions),
    dbc(COLLECTIONS.assessments),
    dbc(COLLECTIONS.employees),
    dbc(COLLECTIONS.employeeCertifications),
    dbc(COLLECTIONS.evaluationPeriods),
  ]);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalCompetencies,
    totalPositions,
    totalEmployees,
    activePeriods,
    pendingAssessments,
    expiringCerts,
  ] = await Promise.all([
    competenciesColl.countDocuments({ active: true }),
    positionsColl.countDocuments({ active: true }),
    employeesColl.countDocuments({}),
    periodsColl.countDocuments({ status: 'active' }),
    assessmentsColl.countDocuments({ status: { $in: ['draft', 'submitted'] } }),
    certsColl.countDocuments({
      expirationDate: { $lte: thirtyDaysFromNow, $gte: now },
    }),
  ]);

  return {
    totalCompetencies,
    totalPositions,
    totalEmployees,
    activePeriods,
    pendingAssessments,
    expiringCerts,
  };
}

export default async function CompetencyMatrixDashboard({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix`);
  }

  const userRoles = session.user.roles ?? [];
  const userEmail = session.user.email;
  const hrOrAdmin = isHrOrAdmin(userRoles);
  const stats = await getDashboardStats(userRoles, userEmail);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={dict.dashboard.totalEmployees}
          value={stats.totalEmployees}
          href={`/${lang}/competency-matrix/employees`}
        />
        <StatsCard
          title={dict.dashboard.totalPositions}
          value={stats.totalPositions}
          href={hrOrAdmin ? `/${lang}/competency-matrix/positions` : undefined}
        />
        <StatsCard
          title={dict.dashboard.totalCompetencies}
          value={stats.totalCompetencies}
          href={hrOrAdmin ? `/${lang}/competency-matrix/competencies` : undefined}
        />
        <StatsCard
          title={dict.dashboard.activeAssessments}
          value={stats.activePeriods}
          href={`/${lang}/competency-matrix/assessments`}
        />
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.pendingAssessments > 0 ? (
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <Badge variant="statusPending">
                  {stats.pendingAssessments}
                </Badge>
                <span className="text-sm font-medium">
                  {dict.dashboard.pendingAssessments}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${lang}/competency-matrix/assessments`}>
                  {dict.details}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {dict.dashboard.noPendingAssessments}
            </CardContent>
          </Card>
        )}

        {stats.expiringCerts > 0 ? (
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <Badge variant="statusOverdue">
                  {stats.expiringCerts}
                </Badge>
                <span className="text-sm font-medium">
                  {dict.dashboard.expiringCerts}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${lang}/competency-matrix/certifications`}>
                  {dict.details}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {dict.dashboard.noExpiringCerts}
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}

function StatsCard({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'transition-shadow hover:shadow-md' : ''}>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
