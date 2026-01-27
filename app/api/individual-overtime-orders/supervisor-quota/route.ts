import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSupervisorMonthlyLimit } from '@/app/[lang]/individual-overtime-orders/actions/approval';
import { getSupervisorCombinedMonthlyUsage } from '@/app/[lang]/overtime-submissions/actions/quota';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];

  const orderId = request.nextUrl.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  try {
    const coll = await dbc('individual_overtime_orders');
    const order = await coll.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // Only relevant for pending payout orders
    if (order.status !== 'pending' || !order.payment) {
      return NextResponse.json({
        canGiveFinalApproval: false,
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
        orderHours: order.hours ?? 0,
      });
    }

    // Check if user is leader/manager (not plant-manager)
    const isPlantManager = userRoles.includes('plant-manager');
    const isAdmin = userRoles.includes('admin');
    const isLeaderOrManager = userRoles.some(
      (r: string) => /leader|manager/i.test(r) && r !== 'plant-manager',
    );

    if (!isLeaderOrManager || isPlantManager || isAdmin) {
      return NextResponse.json({
        canGiveFinalApproval: false,
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
        orderHours: order.hours ?? 0,
      });
    }

    const globalLimit = await getGlobalSupervisorMonthlyLimit();
    if (globalLimit <= 0) {
      return NextResponse.json({
        canGiveFinalApproval: false,
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
        orderHours: order.hours ?? 0,
      });
    }

    const usedHours = await getSupervisorCombinedMonthlyUsage(userEmail);
    const remainingHours = Math.max(0, globalLimit - usedHours);
    const canGiveFinalApproval = usedHours + (order.hours ?? 0) <= globalLimit;

    return NextResponse.json({
      canGiveFinalApproval,
      monthlyLimit: globalLimit,
      usedHours,
      remainingHours,
      orderHours: order.hours ?? 0,
    });
  } catch (error) {
    console.error('supervisor-quota error:', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
