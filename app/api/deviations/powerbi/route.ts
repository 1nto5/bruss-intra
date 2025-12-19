import { dbc } from '@/lib/db/mongo';
import moment from 'moment-timezone';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function convertToWarsawTime(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = new Date(date);
  const offset = moment(d).tz('Europe/Warsaw').utcOffset();
  d.setMinutes(d.getMinutes() + offset);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function escapeCSV(value: any): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const coll = await dbc('deviations');
    const configsColl = await dbc('deviations_configs');

    const [deviations, reasonConfig] = await Promise.all([
      coll.find({}).sort({ _id: -1 }).toArray(),
      configsColl.findOne({ config: 'reason_options' }),
    ]);

    const reasonOptions = reasonConfig?.options || [];
    const reasonMap = new Map(
      reasonOptions.map((r: any) => [r.value, { label: r.label, pl: r.pl }])
    );

    const headers = [
      'internal_id',
      'status',
      'article_number',
      'article_name',
      'area',
      'reason',
      'reason_en',
      'reason_pl',
      'period_from',
      'period_to',
    ];

    const lines: string[] = [headers.join(',')];

    deviations.forEach((doc: any) => {
      const reasonLabels = reasonMap.get(doc.reason) as { label: string; pl: string } | undefined;

      const row = [
        escapeCSV(doc.internalId),
        escapeCSV(doc.status),
        escapeCSV(doc.articleNumber),
        escapeCSV(doc.articleName),
        escapeCSV(doc.area),
        escapeCSV(doc.reason),
        escapeCSV(reasonLabels?.label),
        escapeCSV(reasonLabels?.pl),
        escapeCSV(convertToWarsawTime(doc.timePeriod?.from)),
        escapeCSV(convertToWarsawTime(doc.timePeriod?.to)),
      ];

      lines.push(row.join(','));
    });

    const csv = lines.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="deviations-data.csv"',
      },
    });
  } catch (error) {
    console.error('api/deviations/powerbi: ' + error);
    return NextResponse.json(
      { error: 'deviations/powerbi api' },
      { status: 503 }
    );
  }
}
