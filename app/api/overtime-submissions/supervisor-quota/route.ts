import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSupervisorMonthlyLimit,
  getSupervisorCombinedMonthlyUsage,
} from '@/app/[lang]/overtime-submissions/actions/quota';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];

  // Check if user is leader/manager (not plant-manager/admin)
  const isPlantManager = userRoles.includes('plant-manager');
  const isAdmin = userRoles.includes('admin');
  const isLeaderOrManager = userRoles.some(
    (r: string) => /leader|manager/i.test(r) && r !== 'plant-manager',
  );

  const submissionId = request.nextUrl.searchParams.get('submissionId');

  // Without submissionId: return just the supervisor's quota info (for bulk actions)
  if (!submissionId) {
    if (!isLeaderOrManager || isPlantManager || isAdmin) {
      return NextResponse.json({
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
      });
    }

    const supervisorLimit = await getSupervisorMonthlyLimit(userEmail);
    if (supervisorLimit <= 0) {
      return NextResponse.json({
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
      });
    }

    const usedHours = await getSupervisorCombinedMonthlyUsage(userEmail);
    const remainingHours = Math.max(0, supervisorLimit - usedHours);

    return NextResponse.json({
      monthlyLimit: supervisorLimit,
      usedHours,
      remainingHours,
    });
  }

  // With submissionId: return quota info for a specific submission
  try {
    const coll = await dbc('overtime_submissions');
    const submission = await coll.findOne({ _id: new ObjectId(submissionId) });
    if (!submission) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // Only relevant for pending payout submissions
    if (submission.status !== 'pending' || !submission.payoutRequest) {
      return NextResponse.json({
        canGiveFinalApproval: false,
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
        submissionHours: Math.abs(submission.hours ?? 0),
      });
    }

    if (!isLeaderOrManager || isPlantManager || isAdmin) {
      return NextResponse.json({
        canGiveFinalApproval: false,
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
        submissionHours: Math.abs(submission.hours ?? 0),
      });
    }

    const supervisorLimit = await getSupervisorMonthlyLimit(userEmail);
    if (supervisorLimit <= 0) {
      return NextResponse.json({
        canGiveFinalApproval: false,
        monthlyLimit: 0,
        usedHours: 0,
        remainingHours: 0,
        submissionHours: Math.abs(submission.hours ?? 0),
      });
    }

    const usedHours = await getSupervisorCombinedMonthlyUsage(userEmail);
    const remainingHours = Math.max(0, supervisorLimit - usedHours);
    const submissionHours = Math.abs(submission.hours ?? 0);
    const canGiveFinalApproval = usedHours + submissionHours <= supervisorLimit;

    return NextResponse.json({
      canGiveFinalApproval,
      monthlyLimit: supervisorLimit,
      usedHours,
      remainingHours,
      submissionHours,
    });
  } catch (error) {
    console.error('supervisor-quota error:', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
