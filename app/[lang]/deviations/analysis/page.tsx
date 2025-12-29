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
import ParetoChart from './components/pareto-chart';
import TrendChart from './components/trend-chart';
import AnalysisFiltering from './components/analysis-filtering';
import { getDictionary } from '../lib/dict';
import { getParetoData, getTrendData } from './lib/get-analysis-data';
import type { AnalysisParams } from './lib/types';

async function AnalysisCharts({
  params,
  dict,
  lang,
}: {
  params: AnalysisParams;
  dict: any;
  lang: string;
}) {
  const [paretoData, trendData] = await Promise.all([
    getParetoData(params),
    getTrendData(params),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:col-span-1">
        <ParetoChart data={paretoData} dict={dict} lang={lang} />
      </div>
      <div className="lg:col-span-1">
        <TrendChart data={trendData} dict={dict} lang={lang} />
      </div>
    </div>
  );
}

export default async function AnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const dict = await getDictionary(lang);

  const mode = sp.mode || 'month';
  let analysisParams: AnalysisParams | null = null;

  switch (mode) {
    case 'week': {
      const year = parseInt(sp.year || new Date().getFullYear().toString());
      const week = parseInt(sp.week || '1');
      if (!isNaN(year) && !isNaN(week) && week >= 1 && week <= 53) {
        analysisParams = { mode: 'week', year, week };
      }
      break;
    }
    case 'month': {
      const year = parseInt(sp.year || new Date().getFullYear().toString());
      const month = parseInt(
        sp.month || (new Date().getMonth() + 1).toString(),
      );
      if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
        analysisParams = { mode: 'month', year, month };
      }
      break;
    }
    case 'quarter': {
      const year = parseInt(sp.year || new Date().getFullYear().toString());
      const quarter = parseInt(
        sp.quarter || (Math.floor(new Date().getMonth() / 3) + 1).toString(),
      );
      if (!isNaN(year) && !isNaN(quarter) && quarter >= 1 && quarter <= 4) {
        analysisParams = { mode: 'quarter', year, quarter };
      }
      break;
    }
    case 'year': {
      const year = parseInt(sp.year || new Date().getFullYear().toString());
      if (!isNaN(year)) {
        analysisParams = { mode: 'year', year };
      }
      break;
    }
    case 'range':
    default: {
      const from = sp.from;
      const to = sp.to;
      if (from && to) {
        analysisParams = { mode: 'range', from, to };
      } else {
        // Default to current month
        const now = new Date();
        analysisParams = {
          mode: 'month',
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        };
      }
      break;
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{dict.analysis.title}</CardTitle>
            <CardDescription>{dict.analysis.description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${lang}/deviations`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {dict.analysis.backToTable}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <AnalysisFiltering dict={dict} />

        {analysisParams && (
          <AnalysisCharts params={analysisParams} dict={dict} lang={lang} />
        )}
      </CardContent>
    </Card>
  );
}
