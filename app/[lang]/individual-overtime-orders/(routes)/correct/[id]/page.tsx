import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getUserSupervisors } from '@/lib/data/get-user-supervisors';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import CorrectOrderForm from '../../../components/correct-order-form';
import { getDictionary } from '../../../lib/dict';

export const dynamic = 'force-dynamic';

async function getOrder(id: string) {
  try {
    const coll = await dbc('individual_overtime_orders');
    const order = await coll.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return null;
    }

    return {
      _id: order._id.toString(),
      internalId: order.internalId,
      status: order.status,
      supervisor: order.supervisor,
      hours: order.hours,
      reason: order.reason,
      submittedAt: order.submittedAt,
      submittedBy: order.submittedBy,
      payment: order.payment,
      scheduledDayOff: order.scheduledDayOff ?? undefined,
      workStartTime: order.workStartTime,
      workEndTime: order.workEndTime,
      employeeIdentifier: order.employeeIdentifier,
      createdBy: order.createdBy,
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export default async function CorrectOrderPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
  searchParams: Promise<{ from?: string; returnUrl?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang, id } = params;
  const dict = await getDictionary(lang);

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/individual-overtime-orders');
  }

  const [managers, order] = await Promise.all([
    getUserSupervisors(),
    getOrder(id),
  ]);

  if (!order) {
    notFound();
  }

  // Check if user can correct this order
  const isAuthor = order.submittedBy === session.user.email;
  const isHR = session.user.roles?.includes('hr') ?? false;
  const isAdmin = session.user.roles?.includes('admin') ?? false;

  // Correction permissions:
  // - Author: only when status is pending
  // - HR: when status is pending or approved
  // - Admin: all statuses except accounted
  const canCorrect =
    (isAuthor && order.status === 'pending') ||
    (isHR && ['pending', 'approved'].includes(order.status)) ||
    (isAdmin && order.status !== 'accounted');

  if (!canCorrect) {
    redirect('/individual-overtime-orders');
  }

  // Block correction for accounted entries
  if (order.status === 'accounted') {
    redirect('/individual-overtime-orders');
  }

  const fromDetails = searchParams.from === 'details';

  return (
    <CorrectOrderForm
      managers={managers}
      loggedInUserEmail={session.user.email ?? ''}
      order={order}
      dict={dict}
      lang={lang}
      fromDetails={fromDetails}
      returnUrl={searchParams.returnUrl}
    />
  );
}
