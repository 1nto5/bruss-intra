import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Locale } from '@/lib/config/i18n';
import FailureStatsSummaryCards from './components/failure-stats-summary-cards';
import FailureBreakdownChart from './components/failure-breakdown-chart';
import FailureTrendChart from './components/failure-trend-chart';
import OeeFilteringAndOptions from '../components/oee-filtering-and-options';
import { getDictionary } from '../lib/dict';
import type { OeeParams } from './lib/types';
import { getOvens } from '../lib/get-ovens';

export default async function FailureStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const dict = await getDictionary(lang);

  // Fetch available ovens
  const ovens = await getOvens();

  // Extract oven filter from search params
  const ovenParam = sp.oven;
  const selectedOvens = ovenParam
    ? ovenParam.split(',').filter((o) => o.trim().length > 0)
    : [];

  // Extract time selection parameters (same as OEE)
  const mode = sp.mode || 'range';

  // Build params object based on mode
  let oeeParams: OeeParams | null = null;

  switch (mode) {
    case 'day':
      if (sp.date) {
        oeeParams = {
          mode: 'day',
          date: sp.date,
          ovens: selectedOvens.length > 0 ? selectedOvens : undefined,
        };
      } else {
        oeeParams = {
          mode: 'day',
          date: new Date().toISOString().split('T')[0],
          ovens: selectedOvens.length > 0 ? selectedOvens : undefined,
        };
      }
      break;

    case 'week':
      const year = sp.year ? parseInt(sp.year) : new Date().getFullYear();
      const week = sp.week ? parseInt(sp.week) : 1;
      oeeParams = {
        mode: 'week',
        year,
        week,
        ovens: selectedOvens.length > 0 ? selectedOvens : undefined,
      };
      break;

    case 'month':
      const mYear = sp.year ? parseInt(sp.year) : new Date().getFullYear();
      const month = sp.month ? parseInt(sp.month) : new Date().getMonth() + 1;
      oeeParams = {
        mode: 'month',
        year: mYear,
        month,
        ovens: selectedOvens.length > 0 ? selectedOvens : undefined,
      };
      break;

    case 'range':
    default:
      const to = sp.to || new Date().toISOString().split('T')[0];
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      const from = sp.from || defaultFrom.toISOString().split('T')[0];
      oeeParams = {
        mode: 'range',
        from,
        to,
        ovens: selectedOvens.length > 0 ? selectedOvens : undefined,
      };
      break;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{dict.failureStatistics.title}</CardTitle>
            <CardDescription>{dict.failureStatistics.description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${lang}/oven-data/oee`}>
              <ArrowLeft />
              {dict.oeeButtons.backToOEE}
            </Link>
          </Button>
        </div>
        <OeeFilteringAndOptions dict={dict} ovens={ovens} />
      </CardHeader>
      <CardContent className="space-y-6">
        {oeeParams && (
          <>
            <FailureStatsSummaryCards params={oeeParams} dict={dict} />
            <FailureBreakdownChart params={oeeParams} dict={dict} lang={lang} />
            <FailureTrendChart params={oeeParams} dict={dict} lang={lang} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
