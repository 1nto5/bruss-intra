import { dbc } from '@/lib/db/mongo';
import { convertToTimezone } from '@/lib/utils/date-format';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function convertToWarsawDateTime(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = convertToTimezone(new Date(date), 'Europe/Warsaw');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface TableAnswer {
  itemKey: string;
  value: unknown;
  explanation?: string;
}

interface Answer {
  questionKey: string;
  value?: unknown;
  tableAnswers?: TableAnswer[];
}

interface Submission {
  _id?: { toString(): string };
  workplace?: string;
  reportTypeKey?: string;
  operators?: string[];
  submittedAt?: Date | string;
  answers?: Answer[];
}

interface Translations {
  pl?: string;
  en?: string;
  de?: string;
}

interface TableItem {
  key: string;
  translations?: Translations;
}

interface Question {
  key: string;
  translations?: Translations;
  tableItems?: TableItem[];
}

interface ReportType {
  key: string;
  translations?: Translations;
  questions?: Question[];
}

export async function GET() {
  try {
    const submissionsColl = await dbc('dmcheck_report_submissions');
    const reportTypesColl = await dbc('dmcheck_report_types');

    const [submissions, reportTypes] = await Promise.all([
      submissionsColl.find({}).sort({ submittedAt: -1 }).toArray(),
      reportTypesColl.find({}).toArray(),
    ]);

    // Build lookup maps for translations
    const reportTypeMap = new Map<string, Translations>();
    const questionMap = new Map<string, Translations>();
    const itemMap = new Map<string, Translations>();

    for (const rt of reportTypes as ReportType[]) {
      reportTypeMap.set(rt.key, rt.translations || {});
      for (const q of rt.questions || []) {
        questionMap.set(q.key, q.translations || {});
        for (const item of q.tableItems || []) {
          itemMap.set(item.key, item.translations || {});
        }
      }
    }

    const headers = [
      'submission_id',
      'workplace',
      'report_type_key',
      'report_type_pl',
      'report_type_en',
      'operators',
      'submitted_at',
      'question_key',
      'question_pl',
      'question_en',
      'item_key',
      'item_pl',
      'item_en',
      'value',
      'explanation',
    ];

    const lines: string[] = [headers.join(',')];

    for (const doc of submissions as Submission[]) {
      const baseRow = {
        submissionId: doc._id?.toString() || '',
        workplace: doc.workplace || '',
        reportTypeKey: doc.reportTypeKey || '',
        reportTypePl: reportTypeMap.get(doc.reportTypeKey || '')?.pl || '',
        reportTypeEn: reportTypeMap.get(doc.reportTypeKey || '')?.en || '',
        operators: (doc.operators || []).join(';'),
        submittedAt: convertToWarsawDateTime(doc.submittedAt),
      };

      for (const answer of doc.answers || []) {
        const questionTrans = questionMap.get(answer.questionKey) || {};

        if (answer.tableAnswers && answer.tableAnswers.length > 0) {
          for (const ta of answer.tableAnswers) {
            const itemTrans = itemMap.get(ta.itemKey) || {};
            const row = [
              escapeCSV(baseRow.submissionId),
              escapeCSV(baseRow.workplace),
              escapeCSV(baseRow.reportTypeKey),
              escapeCSV(baseRow.reportTypePl),
              escapeCSV(baseRow.reportTypeEn),
              escapeCSV(baseRow.operators),
              escapeCSV(baseRow.submittedAt),
              escapeCSV(answer.questionKey),
              escapeCSV(questionTrans.pl),
              escapeCSV(questionTrans.en),
              escapeCSV(ta.itemKey),
              escapeCSV(itemTrans.pl),
              escapeCSV(itemTrans.en),
              escapeCSV(ta.value),
              escapeCSV(ta.explanation || ''),
            ];
            lines.push(row.join(','));
          }
        } else {
          const row = [
            escapeCSV(baseRow.submissionId),
            escapeCSV(baseRow.workplace),
            escapeCSV(baseRow.reportTypeKey),
            escapeCSV(baseRow.reportTypePl),
            escapeCSV(baseRow.reportTypeEn),
            escapeCSV(baseRow.operators),
            escapeCSV(baseRow.submittedAt),
            escapeCSV(answer.questionKey),
            escapeCSV(questionTrans.pl),
            escapeCSV(questionTrans.en),
            escapeCSV(''),
            escapeCSV(''),
            escapeCSV(''),
            escapeCSV(answer.value),
            escapeCSV(''),
          ];
          lines.push(row.join(','));
        }
      }
    }

    const csv = lines.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="dmcheck-reports-data.csv"',
      },
    });
  } catch (error) {
    console.error('api/dmcheck-reports/excel: ' + error);
    return NextResponse.json(
      { error: 'dmcheck-reports/excel api' },
      { status: 503 }
    );
  }
}
