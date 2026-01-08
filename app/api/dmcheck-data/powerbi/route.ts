import { dbc } from '@/lib/db/mongo';
import { convertToLocalTime } from '@/lib/utils/date-format';

export const dynamic = 'force-dynamic';

const DEFECT_REPORTING_START = new Date('2025-11-01T00:00:00.000Z');
const ARCHIVE_DAYS = 90;

function formatOperators(operator: string | string[] | undefined): string {
  if (!operator) return '';
  if (Array.isArray(operator)) return operator.join('; ');
  return operator;
}

function formatLocalTime(date: Date) {
  if (!date) return '';
  const localDate = convertToLocalTime(date);
  return localDate.toISOString().replace('T', ' ').slice(0, 19);
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const query = {
    time: { $gte: DEFECT_REPORTING_START },
    workplace: {
      $in: [
        'eol810',
        'eol405',
        'eol488',
        'fw1',
        'fw2',
        'fw3',
        'fw4',
        'fw5',
        'fw6',
        'fw7',
        'fw8',
      ],
    },
  };

  const archiveThreshold = new Date(
    Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000
  );
  const skipArchive = DEFECT_REPORTING_START >= archiveThreshold;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const collScans = await dbc('dmcheck_scans');
        const collDefects = await dbc('dmcheck_defects');

        // Load defects map (small dataset, ~100 docs)
        const defects = await collDefects.find().toArray();
        const defectsMap = new Map(defects.map((d: any) => [d.key, d]));

        // Send CSV header
        const headers = [
          'dmc',
          'time',
          'workplace',
          'article',
          'operator',
          'status',
          'defect_key',
          'defect_pl',
          'defect_de',
          'defect_en',
        ];
        controller.enqueue(encoder.encode(headers.join(',') + '\n'));

        // Helper to process and stream a single doc
        const processDoc = (doc: any) => {
          const defectKeysList = doc.defectKeys?.length
            ? doc.defectKeys
            : [null];

          defectKeysList.forEach((defectKey: string | null) => {
            const defect = defectKey ? defectsMap.get(defectKey) : null;

            const row = [
              `"${doc.dmc || ''}"`,
              escapeCSV(formatLocalTime(doc.time)),
              escapeCSV(doc.workplace?.toUpperCase()),
              escapeCSV(doc.article),
              escapeCSV(formatOperators(doc.operator)),
              escapeCSV(doc.status),
              escapeCSV(defectKey),
              escapeCSV(defect?.translations?.pl),
              escapeCSV(defect?.translations?.de),
              escapeCSV(defect?.translations?.en),
            ];
            controller.enqueue(encoder.encode(row.join(',') + '\n'));
          });
        };

        // Stream main collection
        const cursor = collScans.find(query).sort({ _id: -1 });
        for await (const doc of cursor) {
          processDoc(doc);
        }

        // Stream archive if needed
        if (!skipArchive) {
          const collScansArchive = await dbc('dmcheck_scans_archive');
          const archiveCursor = collScansArchive.find(query).sort({ _id: -1 });
          for await (const doc of archiveCursor) {
            processDoc(doc);
          }
        }

        controller.close();
      } catch (error) {
        console.error('api/dmcheck-data/powerbi: ' + error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="defects-data.csv"',
      'Transfer-Encoding': 'chunked',
    },
  });
}
