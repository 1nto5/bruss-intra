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
import { dbc } from '@/lib/db/mongo';

async function getInventoryItems(searchParams: URLSearchParams) {
  const query: any = {};

  // Multi-select filters
  if (searchParams.has('category')) {
    const categories = searchParams.getAll('category');
    query.category = categories.length === 1 ? categories[0] : { $in: categories };
  }

  if (searchParams.has('status')) {
    const statuses = searchParams.getAll('status');
    query.statuses = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  // Assignment status filter
  if (searchParams.has('assignmentStatus')) {
    const assignmentStatus = searchParams.get('assignmentStatus');
    if (assignmentStatus === 'assigned') {
      query.currentAssignment = { $exists: true, $ne: null };
    } else if (assignmentStatus === 'unassigned') {
      query.$or = [
        { currentAssignment: { $exists: false } },
        { currentAssignment: null },
      ];
    }
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
    query.$or = [
      { assetId: searchRegex },
      { serialNumber: searchRegex },
      { model: searchRegex },
      { manufacturer: searchRegex },
    ];
  }

  try {
    const coll = await dbc('it_inventory');
    const rawItems = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(2000)
      .toArray();

    // Serialize ObjectIds for client components
    const items = rawItems.map((item: any) => {
      const currentAssignment = item.currentAssignment
        ? (() => {
            // Handle both old (employee directly) and new (assignment.type) structures
            const assignment = item.currentAssignment.assignment
              ? (item.currentAssignment.assignment.type === 'employee'
                  ? {
                      type: 'employee' as const,
                      employee: {
                        ...item.currentAssignment.assignment.employee,
                        _id: item.currentAssignment.assignment.employee._id?.toString(),
                      },
                    }
                  : item.currentAssignment.assignment)
              : (item.currentAssignment.employee
                  ? {
                      type: 'employee' as const,
                      employee: {
                        ...item.currentAssignment.employee,
                        _id: item.currentAssignment.employee._id?.toString(),
                      },
                    }
                  : undefined);

            // Exclude old 'employee' field to avoid ObjectId serialization issues
            const { employee, ...restAssignment } = item.currentAssignment;
            return {
              ...restAssignment,
              assignment,
            };
          })()
        : undefined;

      const assignmentHistory = (item.assignmentHistory || []).map((record: any) => {
        // Handle both old (employee directly) and new (assignment.type) structures
        const assignment = record.assignment
          ? (record.assignment.type === 'employee'
              ? {
                  type: 'employee' as const,
                  employee: {
                    ...record.assignment.employee,
                    _id: record.assignment.employee._id?.toString(),
                  },
                }
              : record.assignment)
          : (record.employee
              ? {
                  type: 'employee' as const,
                  employee: {
                    ...record.employee,
                    _id: record.employee._id?.toString(),
                  },
                }
              : undefined);

        // Exclude old 'employee' field to avoid ObjectId serialization issues
        const { employee, ...restRecord } = record;
        return {
          ...restRecord,
          assignment,
        };
      });

      return {
        ...item,
        _id: item._id.toString(),
        currentAssignment,
        assignmentHistory,
      };
    });

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
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/it-inventory');
  }

  // Check roles for access
  const hasAdminRole = session.user.roles?.includes('admin');
  const hasManagerRole = session.user.roles?.includes('manager');
  const canView = hasAdminRole || hasManagerRole;
  const canManage = hasAdminRole;

  if (!canView) {
    redirect('/unauthorized');
  }

  const { lang } = await params;
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

  const { items, fetchTime } = await getInventoryItems(urlSearchParams);

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
          <TableFiltering dict={dict} lang={lang} fetchTime={fetchTime} />
        </Suspense>
      </CardHeader>

      {/* Data Table */}
      <InventoryTableWrapper items={items} session={session} dict={dict} lang={lang} />
    </Card>
  );
}
