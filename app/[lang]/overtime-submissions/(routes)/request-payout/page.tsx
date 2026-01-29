import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
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

  // Fetch user balance (approved + accounted only)
  const balanceParams = new URLSearchParams({
    employee: session.user.email,
    status: 'pending,approved,accounted',
    userRoles: 'admin',
  });
  const balanceRes = await fetch(
    `${process.env.API}/overtime-submissions/balances?${balanceParams}`,
    { next: { revalidate: 0 } },
  );
  const balances: EmployeeBalanceType[] = balanceRes.ok
    ? await balanceRes.json()
    : [];
  const userBalance = balances.find((b) => b.email === session.user?.email);
  const confirmedBalance = userBalance?.allTimeBalance ?? 0;

  // Get pending payout requests to calculate available balance
  const coll = await dbc('overtime_submissions');
  const pendingPayoutsResult = await coll
    .aggregate([
      {
        $match: {
          submittedBy: session.user.email,
          payoutRequest: true,
          status: 'pending',
        },
      },
      { $group: { _id: null, total: { $sum: '$hours' } } },
    ])
    .toArray();
  const pendingPayoutHours = pendingPayoutsResult[0]?.total ?? 0; // negative value

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
