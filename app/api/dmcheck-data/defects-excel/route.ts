import { formatOperators } from '@/app/[lang]/dmcheck-data/lib/utils';
import { dbc } from '@/lib/db/mongo';
import { convertToLocalTime } from '@/lib/utils/date-format';
import { Workbook } from 'exceljs';
import type { Document, Filter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

// TODO: TEMPORARY OPTIMIZATION - Remove after ~6 months (mid-2026)
// Defect reporting started November 2025. This date clamp prevents
// unnecessary archive queries while defect data is still new.
const DEFECT_REPORTING_START = new Date('2025-11-01T00:00:00.000Z');
const ARCHIVE_DAYS = 90; // 3 * 30 days, matches archive-scans.js in bruss-cron

function convertTime(date: Date) {
  if (!date) return null;
  return convertToLocalTime(date);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: Filter<Document> = {};
  const andConditions: Filter<Document>[] = [];

  searchParams.forEach((value, key) => {
    if (key === 'from' || key === 'to') {
      if (!query.time) query.time = {};
      if (key === 'from') {
        const localDate = new Date(value);
        const offset = localDate.getTimezoneOffset();
        const utcDate = new Date(localDate);
        utcDate.setMinutes(utcDate.getMinutes() + offset);
        query.time.$gte = utcDate;
      }
      if (key === 'to') {
        const localDate = new Date(value);
        const offset = localDate.getTimezoneOffset();
        const utcDate = new Date(localDate);
        utcDate.setMinutes(utcDate.getMinutes() + offset);
        query.time.$lte = utcDate;
      }
    } else if (
      key === 'dmc' ||
      key === 'hydra_batch' ||
      key === 'pallet_batch'
    ) {
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (values.length > 0) {
        andConditions.push({
          [key]: { $exists: true, $nin: [null, ''] },
        });

        if (values.length === 1) {
          andConditions.push({ [key]: values[0] });
        } else {
          andConditions.push({ [key]: { $in: values } });
        }
      }
    } else if (key === 'status' || key === 'workplace' || key === 'article') {
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (
        key === 'status' &&
        (values.includes('rework') || values.includes('defect'))
      ) {
        const otherStatuses = values.filter(
          (v) => v !== 'rework' && v !== 'defect',
        );
        const statusConditions = [];

        if (otherStatuses.length > 0) {
          statusConditions.push({ status: { $in: otherStatuses } });
        }

        if (values.includes('rework')) {
          statusConditions.push({ status: { $regex: /^rework\d*$/ } });
        }

        if (values.includes('defect')) {
          statusConditions.push({ status: { $regex: /^defect\d*$/ } });
        }

        if (statusConditions.length === 1) {
          Object.assign(query, statusConditions[0]);
        } else {
          query.$or = statusConditions;
        }
      } else if (values.length === 1) {
        query[key] = values[0];
      } else if (values.length > 1) {
        query[key] = { $in: values };
      }
    } else if (key === 'defectKey') {
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (values.length > 0) {
        if (values.length === 1) {
          andConditions.push({ defectKeys: values[0] });
        } else {
          andConditions.push({ defectKeys: { $in: values } });
        }
      }
    }
  });

  // Only return scans with defects
  andConditions.push({
    defectKeys: { $exists: true, $ne: [], $nin: [null] },
  });

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  // Clamp from date - defects don't exist before this date
  if (!query.time) query.time = {};
  if (!query.time.$gte || query.time.$gte < DEFECT_REPORTING_START) {
    query.time.$gte = DEFECT_REPORTING_START;
  }

  // Skip archive if query date is within archive threshold and after defect reporting start
  const archiveThreshold = new Date(
    Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000,
  );
  const skipArchive =
    query.time.$gte >= DEFECT_REPORTING_START &&
    query.time.$gte >= archiveThreshold;

  try {
    const collScans = await dbc('dmcheck_scans');
    const collDefects = await dbc('dmcheck_defects');

    const defects = await collDefects.find().toArray();
    const defectsMap = new Map(defects.map((d) => [d.key, d]));

    let scans = await collScans
      .find(query)
      .sort({ time: -1 })
      .limit(10000)
      .toArray();

    if (scans.length < 10000 && !skipArchive) {
      const collScansArchive = await dbc('dmcheck_scans_archive');
      const remainingLimit = 10000 - scans.length;
      const scansArchive = await collScansArchive
        .find(query)
        .sort({ time: -1 })
        .limit(remainingLimit)
        .toArray();
      scans = [...scans, ...scansArchive];
    }

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('defects');

    sheet.columns = [
      { header: 'DMC', key: 'dmc', width: 36 },
      { header: 'Time', key: 'time', width: 18 },
      { header: 'Workplace', key: 'workplace', width: 15 },
      { header: 'Article', key: 'article', width: 10 },
      { header: 'Operator', key: 'operator', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Defect Key', key: 'defect_key', width: 20 },
      { header: 'Defect (PL)', key: 'defect_pl', width: 30 },
      { header: 'Defect (DE)', key: 'defect_de', width: 30 },
      { header: 'Defect (EN)', key: 'defect_en', width: 30 },
    ];

    // Flatten: one row per defect occurrence
    scans.forEach((doc) => {
      if (!doc.defectKeys || doc.defectKeys.length === 0) return;

      doc.defectKeys.forEach((defectKey: string) => {
        const defect = defectsMap.get(defectKey);

        sheet.addRow({
          dmc: doc.dmc,
          time: convertTime(new Date(doc.time)),
          workplace: doc.workplace?.toUpperCase() || '',
          article: doc.article,
          operator: formatOperators(doc.operator),
          status: doc.status,
          defect_key: defectKey,
          defect_pl: defect?.translations?.pl || defectKey,
          defect_de: defect?.translations?.de || defectKey,
          defect_en: defect?.translations?.en || defectKey,
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="DMCheck-defects.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating defects Excel file:', error);
    return NextResponse.json(
      { error: 'defects-excel api' },
      { status: 503 },
    );
  }
}
