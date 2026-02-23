export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { COLLECTIONS, EVALUATION_PERIOD_LABELS } from '../../lib/constants';
import { localize } from '../../lib/types';
import type { EvaluationPeriodKind } from '../../lib/types';
import { isHrOrAdmin } from '../../lib/permissions';
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
import { EvaluationPeriodActions } from '../../components/settings/evaluation-period-actions';
import { CertTypesTable } from '../../components/settings/cert-types-table';
import { fetchCertificationTypes } from '../../lib/fetch-cert-types';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/settings`);
  }

  const userRoles = session.user.roles ?? [];
  if (!isHrOrAdmin(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [periodsColl, certTypes] = await Promise.all([
    dbc(COLLECTIONS.evaluationPeriods),
    fetchCertificationTypes(),
  ]);
  const periods = await periodsColl
    .find({})
    .sort({ startDate: -1 })
    .toArray();

  const serialized = periods.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    type: p.type,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="md:hidden">{dict.settings.evaluationPeriods}</CardTitle>
          <Button asChild>
            <Link href={`/${lang}/competency-matrix/settings/evaluation-periods/add`}>
              {dict.settings.addPeriod}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {serialized.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.settings.periodName}</TableHead>
                    <TableHead>{dict.settings.periodType}</TableHead>
                    <TableHead>{dict.settings.startDate}</TableHead>
                    <TableHead>{dict.settings.endDate}</TableHead>
                    <TableHead>{dict.settings.periodStatus}</TableHead>
                    <TableHead>{dict.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serialized.map((period) => (
                    <TableRow key={period._id}>
                      <TableCell className="font-medium">
                        {period.name}
                      </TableCell>
                      <TableCell>
                        {localize(
                          EVALUATION_PERIOD_LABELS[period.type as EvaluationPeriodKind],
                          safeLang,
                        )}
                      </TableCell>
                      <TableCell>
                        {period.startDate
                          ? new Date(period.startDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {period.endDate
                          ? new Date(period.endDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            period.status === 'active'
                              ? 'statusApproved'
                              : period.status === 'planned'
                                ? 'statusDraft'
                                : 'statusClosed'
                          }
                        >
                          {dict.status[period.status as keyof typeof dict.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <EvaluationPeriodActions
                          period={period}
                          dict={dict}
                          lang={lang}
                        />
                      </TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dict.settings.certificationTypes}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CertTypesTable certTypes={certTypes} dict={dict} lang={lang} />
        </CardContent>
      </Card>
    </div>
  );
}
