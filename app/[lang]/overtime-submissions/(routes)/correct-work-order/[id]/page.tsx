import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getSubmissionSupervisors } from '@/lib/data/get-submission-supervisors';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import CorrectWorkOrderForm from '../../../components/correct-work-order-form';
import { getDictionary } from '../../../lib/dict';

export const dynamic = 'force-dynamic';

async function getOvertimeSubmission(id: string) {
  try {
    const coll = await dbc('overtime_submissions');
    const submission = await coll.findOne({ _id: new ObjectId(id) });

    if (!submission) {
      return null;
    }

    return {
      _id: submission._id.toString(),
      internalId: submission.internalId,
      status: submission.status,
      supervisor: submission.supervisor,
      date: submission.date,
      hours: submission.hours,
      reason: submission.reason,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedBy,
      payment: submission.payment,
      overtimeRequest: submission.overtimeRequest ?? false,
      scheduledDayOff: submission.scheduledDayOff ?? undefined,
      workStartTime: submission.workStartTime,
      workEndTime: submission.workEndTime,
    };
  } catch (error) {
    console.error('Error fetching overtime submission:', error);
    return null;
  }
}

export default async function CorrectWorkOrderSubmissionPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
  searchParams: Promise<{ from?: string; returnUrl?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang, id } = params;
  const dict = await getDictionary(lang);

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }

  const [managers, submission] = await Promise.all([
    getSubmissionSupervisors(),
    getOvertimeSubmission(id),
  ]);

  if (!submission) {
    notFound();
  }

  // Redirect to regular overtime correction if this is NOT an overtime request
  if (!submission.overtimeRequest) {
    const queryParts = [];
    if (searchParams.from) queryParts.push(`from=${searchParams.from}`);
    if (searchParams.returnUrl) queryParts.push(`returnUrl=${searchParams.returnUrl}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    redirect(`/${lang}/overtime-submissions/correct-overtime/${id}${queryString}`);
  }

  // Check if user can correct this submission
  const isAuthor = submission.submittedBy === session.user.email;
  const isHR = session.user.roles?.includes('hr') ?? false;
  const isAdmin = session.user.roles?.includes('admin') ?? false;

  // Correction permissions:
  // - Author: only when status is pending
  // - HR: when status is pending or approved
  // - Admin: all statuses except accounted
  const canCorrect =
    (isAuthor && submission.status === 'pending') ||
    (isHR && ['pending', 'approved'].includes(submission.status)) ||
    (isAdmin && submission.status !== 'accounted');

  if (!canCorrect) {
    redirect('/overtime-submissions');
  }

  // Block correction for accounted entries
  if (submission.status === 'accounted') {
    redirect('/overtime-submissions');
  }

  const fromDetails = searchParams.from === 'details';

  return (
    <CorrectWorkOrderForm
      managers={managers}
      loggedInUserEmail={session.user.email ?? ''}
      submission={submission}
      dict={dict}
      lang={lang}
      fromDetails={fromDetails}
      returnUrl={searchParams.returnUrl}
    />
  );
}

