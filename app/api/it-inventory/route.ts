import { dbc } from '@/lib/db/mongo';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Allowlists for valid values
const VALID_CATEGORIES = [
  'notebook',
  'workstation',
  'monitor',
  'iphone',
  'android',
  'printer',
  'label-printer',
  'portable-scanner',
] as const;

const VALID_STATUSES = [
  'in-use',
  'in-stock',
  'damaged',
  'to-dispose',
  'disposed',
  'to-review',
  'to-repair',
] as const;

const VALID_ASSIGNMENT_STATUSES = ['assigned', 'unassigned'] as const;

// Zod schema for query params validation
const queryParamsSchema = z.object({
  category: z.array(z.enum(VALID_CATEGORIES)).optional(),
  status: z.array(z.enum(VALID_STATUSES)).optional(),
  assignmentStatus: z.enum(VALID_ASSIGNMENT_STATUSES).optional(),
  purchaseDateFrom: z.string().optional(),
  purchaseDateTo: z.string().optional(),
  assignmentDateFrom: z.string().optional(),
  assignmentDateTo: z.string().optional(),
  search: z
    .string()
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Invalid search characters')
    .optional(),
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  // Parse and validate query params
  const rawParams = {
    category: searchParams.has('category')
      ? searchParams.getAll('category')
      : undefined,
    status: searchParams.has('status')
      ? searchParams.getAll('status')
      : undefined,
    assignmentStatus: searchParams.get('assignmentStatus') ?? undefined,
    purchaseDateFrom: searchParams.get('purchaseDateFrom') ?? undefined,
    purchaseDateTo: searchParams.get('purchaseDateTo') ?? undefined,
    assignmentDateFrom: searchParams.get('assignmentDateFrom') ?? undefined,
    assignmentDateTo: searchParams.get('assignmentDateTo') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  };

  const parsed = queryParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const params = parsed.data;
  const query: Record<string, unknown> = {};

  // Category filter (validated)
  if (params.category && params.category.length > 0) {
    query.category =
      params.category.length === 1 ? params.category[0] : { $in: params.category };
  }

  // Status filter (validated)
  if (params.status && params.status.length > 0) {
    query.statuses =
      params.status.length === 1 ? params.status[0] : { $in: params.status };
  }

  // Assignment status filter (validated)
  if (params.assignmentStatus) {
    if (params.assignmentStatus === 'assigned') {
      query.currentAssignment = { $exists: true, $ne: null };
    } else {
      query.$or = [
        { currentAssignment: { $exists: false } },
        { currentAssignment: null },
      ];
    }
  }

  // Purchase date range filter (validated dates)
  if (params.purchaseDateFrom || params.purchaseDateTo) {
    const purchaseDateFilter: Record<string, Date> = {};
    if (params.purchaseDateFrom) {
      purchaseDateFilter.$gte = new Date(params.purchaseDateFrom);
    }
    if (params.purchaseDateTo) {
      purchaseDateFilter.$lte = new Date(params.purchaseDateTo);
    }
    query.purchaseDate = purchaseDateFilter;
  }

  // Assignment date range filter (validated dates)
  if (params.assignmentDateFrom || params.assignmentDateTo) {
    const assignmentDateFilter: Record<string, Date> = {};
    if (params.assignmentDateFrom) {
      assignmentDateFilter.$gte = new Date(params.assignmentDateFrom);
    }
    if (params.assignmentDateTo) {
      assignmentDateFilter.$lte = new Date(params.assignmentDateTo);
    }
    query['currentAssignment.assignedAt'] = assignmentDateFilter;
  }

  // Text search filter (validated and escaped)
  if (params.search) {
    const escapedSearch = escapeRegex(params.search);
    const searchRegex = new RegExp(escapedSearch, 'i');
    query.$or = [
      { assetId: searchRegex },
      { serialNumber: searchRegex },
      { model: searchRegex },
      { manufacturer: searchRegex },
      { notes: searchRegex },
    ];
  }

  try {
    const coll = await dbc('it_inventory');
    const items = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(2000)
      .toArray();
    return new NextResponse(JSON.stringify(items));
  } catch (error) {
    console.error('api/it-inventory: ' + error);
    return NextResponse.json({ error: 'it-inventory api' }, { status: 503 });
  }
}
