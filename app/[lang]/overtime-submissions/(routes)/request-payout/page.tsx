import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getUserSupervisors } from '@/lib/data/get-user-supervisors';
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

  // Fetch user balance
  const balanceParams = new URLSearchParams({
    employee: session.user.email,
    status: 'pending,approved',
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
  const balance = userBalance?.allTimeBalance ?? 0;

  // Redirect if no balance
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
