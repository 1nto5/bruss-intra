import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDictionary } from './lib/dict';
import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Locale } from '@/lib/config/i18n';
import TableFiltering from './components/table-filtering';
import InventoryTableWrapper from './components/table/inventory-table-wrapper';
import { ITInventoryItem } from './lib/types';
import { serializeAssignment, serializeAssignmentHistory } from './lib/serialize';
import { dbc } from '@/lib/db/mongo';
import getEmployees from '@/lib/data/get-employees';

async function getInventoryItems(searchParams: URLSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  // Multi-select filters
  if (searchParams.has('category')) {
    const categories = searchParams.getAll('category');
    query.category = categories.length === 1 ? categories[0] : { $in: categories };
  }

  if (searchParams.has('status')) {
    const statuses = searchParams.getAll('status');
    query.statuses = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  // Collect $or conditions to combine with $and if multiple exist
  const orConditions: Record<string, unknown>[][] = [];

  // Assignment status filter
  if (searchParams.has('assignmentStatus')) {
    const assignmentStatus = searchParams.get('assignmentStatus');
    if (assignmentStatus === 'assigned') {
      query.currentAssignment = { $exists: true, $ne: null };
    } else if (assignmentStatus === 'unassigned') {
      orConditions.push([
        { currentAssignment: { $exists: false } },
        { currentAssignment: null },
      ]);
    }
  }

  // Employee filter
  if (searchParams.has('employee')) {
    const employees = searchParams.getAll('employee');
    query['currentAssignment.assignment.employee.identifier'] =
      employees.length === 1 ? employees[0] : { $in: employees };
  }

  // Purchase date range filter
  if (searchParams.has('purchaseDateFrom') || searchParams.has('purchaseDateTo')) {
    query.purchaseDate = {};
    if (searchParams.has('purchaseDateFrom')) {
      query.purchaseDate.$gte = new Date(searchParams.get('purchaseDateFrom')!);
    }
    if (searchParams.has('purchaseDateTo')) {
      query.purchaseDate.$lte = new Date(searchParams.get('purchaseDateTo')!);
    }
  }

  // Assignment date range filter
  if (searchParams.has('assignmentDateFrom') || searchParams.has('assignmentDateTo')) {
    query['currentAssignment.assignedAt'] = {};
    if (searchParams.has('assignmentDateFrom')) {
      query['currentAssignment.assignedAt'].$gte = new Date(
        searchParams.get('assignmentDateFrom')!,
      );
    }
    if (searchParams.has('assignmentDateTo')) {
      query['currentAssignment.assignedAt'].$lte = new Date(
        searchParams.get('assignmentDateTo')!,
      );
    }
  }

  // Text search filter
  if (searchParams.has('search')) {
    const search = searchParams.get('search')!;
    const searchRegex = new RegExp(search, 'i');
    orConditions.push([
      { assetId: searchRegex },
      { serialNumber: searchRegex },
      { model: searchRegex },
      { manufacturer: searchRegex },
    ]);
  }

  // Combine $or conditions
  if (orConditions.length === 1) {
    query.$or = orConditions[0];
  } else if (orConditions.length > 1) {
    query.$and = orConditions.map((orCond) => ({ $or: orCond }));
  }

  try {
    const coll = await dbc('it_inventory');
    const rawItems = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(2000)
      .toArray();

    const items = rawItems.map((item) => ({
      ...item,
      _id: item._id.toString(),
      currentAssignment: serializeAssignment(item.currentAssignment),
      assignmentHistory: serializeAssignmentHistory(item.assignmentHistory),
    }));

    return { items: items as unknown as ITInventoryItem[], fetchTime: new Date() };
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return { items: [], fetchTime: new Date() };
  }
}

export default async function ITInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang } = await params;

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/it-inventory`);
  }

  // Check roles for access
  const hasAdminRole = session.user.roles?.includes('admin');
  const hasManagerRole = session.user.roles?.some((role) =>
    role.toLowerCase().includes('manager'),
  );
  const canView = hasAdminRole || hasManagerRole;
  const canManage = hasAdminRole;

  if (!canView) {
    redirect(`/${lang}`);
  }

  const dict = await getDictionary(lang);
  const search = await searchParams;

  // Convert searchParams to URLSearchParams
  const urlSearchParams = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => urlSearchParams.append(key, v));
      } else {
        urlSearchParams.set(key, value);
      }
    }
  });

  const [{ items, fetchTime }, employees] = await Promise.all([
    getInventoryItems(urlSearchParams),
    getEmployees(),
  ]);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>{dict.page.title}</CardTitle>
          {canManage && (
            <LocalizedLink href="/it-inventory/new-item">
              <Button variant='outline'>
                <Plus /> <span>{dict.page.newItem}</span>
              </Button>
            </LocalizedLink>
          )}
        </div>

        {/* Filters - Horizontal Layout */}
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg mb-6" />}>
          <TableFiltering dict={dict} lang={lang} fetchTime={fetchTime} employees={employees} />
        </Suspense>
      </CardHeader>

      {/* Data Table */}
      <InventoryTableWrapper items={items} session={session} dict={dict} lang={lang} />
    </Card>
  );
}
