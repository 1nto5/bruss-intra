export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { COLLECTIONS, EVALUATION_PERIOD_LABELS } from '../../lib/constants';
import { localize } from '../../lib/types';
import type { EvaluationPeriodKind } from '../../lib/types';
import { hasFullAccess } from '../../lib/permissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EvaluationPeriodActions } from '../../components/settings/evaluation-period-actions';
import { EvalPeriodFiltering } from './components/table-filtering';

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as
    | 'pl'
    | 'de'
    | 'en';

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/settings`);
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const resolvedSearchParams = await searchParams;

  const periodsColl = await dbc(COLLECTIONS.evaluationPeriods);

  // Build server-side filter
  const query: Record<string, unknown> = {};

  const typeParam =
    typeof resolvedSearchParams.type === 'string'
      ? resolvedSearchParams.type
      : undefined;
  if (typeParam) {
    const types = typeParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (types.length > 0) {
      query.type = { $in: types };
    }
  }

  const periods = await periodsColl
    .find(query)
    .sort({ startDate: -1 })
    .toArray();

  const serialized = periods.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    type: p.type,
    startDate: p.startDate,
    endDate: p.endDate,
    employeeCount: (p.employeeIdentifiers as string[] | undefined)?.length ?? 0,
  }));

  // Build type options from EVALUATION_PERIOD_LABELS
  const typeOptions = Object.entries(EVALUATION_PERIOD_LABELS).map(
    ([key, label]) => ({
      value: key,
      label: localize(label, safeLang),
    }),
  );

  const fetchTime = new Date();

  return (
    <Card>
      <CardHeader>
        <EvalPeriodFiltering
          dict={dict}
          typeOptions={typeOptions}
          fetchTime={fetchTime}
        />
      </CardHeader>
      <Separator />
      <CardContent>
        {serialized.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.settings.periodName}</TableHead>
                <TableHead>{dict.actions}</TableHead>
                <TableHead>{dict.settings.employeeCount}</TableHead>
                <TableHead>{dict.settings.periodType}</TableHead>
                <TableHead>{dict.settings.startDate}</TableHead>
                <TableHead>{dict.settings.endDate}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serialized.map((period) => (
                <TableRow key={period._id}>
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell>
                    <EvaluationPeriodActions
                      periodId={period._id}
                      dict={dict}
                      lang={lang}
                    />
                  </TableCell>
                  <TableCell>{period.employeeCount}</TableCell>
                  <TableCell>
                    {localize(
                      EVALUATION_PERIOD_LABELS[
                        period.type as EvaluationPeriodKind
                      ],
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{dict.noData}</p>
        )}
      </CardContent>
    </Card>
  );
}
