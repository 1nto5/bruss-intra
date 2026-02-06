import { dbc } from '@/lib/db/mongo';
import type { Document, Filter } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
// https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation
// https://nextjs.org/docs/app/api-reference/functions/revalidateTag
export const dynamic = 'force-dynamic';
// 'auto' | 'force-dynamic' | 'error' | 'force-static'

// TODO: TEMPORARY OPTIMIZATION - Remove after ~6 months (mid-2026)
// Defect reporting started November 2025. This date clamp prevents
// unnecessary archive queries while defect data is still new.
// Once sufficient defect history exists, remove this logic entirely.
const DEFECT_REPORTING_START = new Date('2025-11-01T00:00:00.000Z');
const ARCHIVE_DAYS = 90; // 3 * 30 days, matches archive-scans.js in bruss-cron

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: Filter<Document> = {};
  const andConditions: Filter<Document>[] = [];

  searchParams.forEach((value, key) => {
    if (key === 'from' || key === 'to') {
      // Date filters remain as AND conditions (time range)
      if (!query.time) query.time = {};
      if (key === 'from') query.time.$gte = new Date(value);
      if (key === 'to') query.time.$lte = new Date(value);
    } else if (
      key === 'dmc' ||
      key === 'hydra_batch' ||
      key === 'pallet_batch'
    ) {
      // Handle multiple values separated by commas - OR within field, AND between fields
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (values.length > 0) {
        // Ensure field exists and is not empty
        andConditions.push({
          [key]: { $exists: true, $nin: [null, ''] },
        });

        if (values.length === 1) {
          // Single value - use exact match
          andConditions.push({
            [key]: values[0],
          });
        } else {
          // Multiple values - use $in for exact matches
          andConditions.push({
            [key]: { $in: values },
          });
        }
      }
    } else if (key === 'status' || key === 'workplace' || key === 'article') {
      // Handle multi-select filters - OR within field, AND between fields
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (key === 'status' && (values.includes('rework') || values.includes('defect'))) {
        // Handle rework and defect special cases
        const otherStatuses = values.filter((v) => v !== 'rework' && v !== 'defect');
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
        // Single value
        query[key] = values[0];
      } else if (values.length > 1) {
        // Multiple values - use $in for OR within field
        query[key] = { $in: values };
      }
    }
  });

  // Add $and conditions if any exist
  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  // Clamp from date for defect queries - no defects exist before this date
  const statusParam = searchParams.get('status');
  if (statusParam?.includes('defect')) {
    if (!query.time) query.time = {};
    if (!query.time.$gte || query.time.$gte < DEFECT_REPORTING_START) {
      query.time.$gte = DEFECT_REPORTING_START;
    }
  }

  // Skip archive if query date is within archive threshold and after defect reporting start
  const archiveThreshold = new Date(Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  const skipArchive =
    statusParam?.includes('defect') &&
    query.time?.$gte >= DEFECT_REPORTING_START &&
    query.time?.$gte >= archiveThreshold;

  try {
    const coll = await dbc('dmcheck_scans');
    let scans = await coll.find(query).sort({ _id: -1 }).limit(1000).toArray();

    if (scans.length < 1000 && !skipArchive) {
      const archiveColl = await dbc('dmcheck_scans_archive');
      const archiveScans = await archiveColl
        .find(query)
        .sort({ _id: -1 })
        .limit(1000 - scans.length)
        .toArray();
      scans = scans.concat(archiveScans).slice(0, 1000);
    }

    return new NextResponse(JSON.stringify(scans));
  } catch (error) {
    console.error('api/dmcheck-data/dmc: ' + error);
    return NextResponse.json(
      { error: 'dmcheck-data/dmc api' },
      { status: 503 },
    );
  }
}
