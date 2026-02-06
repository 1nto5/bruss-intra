import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import getEmployees from '@/lib/data/get-employees';
import { redirect } from 'next/navigation';
import AddOrderForm from '../../components/add-order-form';
import { getDictionary } from '../../lib/dict';

export const dynamic = 'force-dynamic';

export default async function AddOrderPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const employees = await getEmployees();
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=${encodeURIComponent(`/individual-overtime-orders/add`)}`,
    );
  }

  const userRoles = session.user?.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isManagerOrLeader = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('leader'),
  );

  if (!isHR && !isAdmin && !isManagerOrLeader) {
    redirect(`/${lang}/individual-overtime-orders`);
  }

  return (
    <AddOrderForm
      employees={employees}
      loggedInUserEmail={session?.user?.email ?? ''}
      dict={dict}
      lang={lang}
    />
  );
}
