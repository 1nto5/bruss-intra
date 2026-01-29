import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getUserSupervisors } from '@/lib/data/get-user-supervisors';
import { dbc } from '@/lib/db/mongo';
import { redirect } from 'next/navigation';
import PayoutRequestForm from '../../components/payout-request-form';
import { getDictionary } from '../../lib/dict';

export const dynamic = 'force-dynamic';

export default async function RequestPayoutPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const supervisors = await getUserSupervisors();
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=${encodeURIComponent(`/overtime-submissions/request-payout`)}`,
    );
  }

  // Single aggregation to get both confirmed balance and pending payouts
  const coll = await dbc('overtime_submissions');
  const balanceResult = await coll
    .aggregate([
      {
        $match: {
          submittedBy: session.user.email,
          status: { $nin: ['cancelled', 'rejected'] },
        },
      },
      {
        $group: {
          _id: null,
          confirmedBalance: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved', 'accounted']] },
                '$hours',
                0,
              ],
            },
          },
          pendingPayoutHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$payoutRequest', true] },
                    { $eq: ['$status', 'pending'] },
                  ],
                },
                '$hours',
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const confirmedBalance = balanceResult[0]?.confirmedBalance ?? 0;
  const pendingPayoutHours = balanceResult[0]?.pendingPayoutHours ?? 0;
  // Available balance = confirmed balance + pending payouts (payouts are negative)
  const balance = confirmedBalance + pendingPayoutHours;

  // Redirect if no available balance
  if (balance <= 0) {
    redirect(`/${lang}/overtime-submissions`);
  }

  return (
    <PayoutRequestForm
      managers={supervisors}
      balance={balance}
      dict={dict}
      lang={lang}
    />
  );
}
