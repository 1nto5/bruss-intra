import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getSubmissionSupervisors } from '@/lib/data/get-submission-supervisors';
import { getUsers } from '@/lib/data/get-users';
import { redirect } from 'next/navigation';
import AddWorkOrderForm from '../../components/add-work-order-form';
import { getDictionary } from '../../lib/dict';

export const dynamic = 'force-dynamic';

export default async function AddWorkOrderPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const [users, supervisors] = await Promise.all([getUsers(), getSubmissionSupervisors()]);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=${encodeURIComponent(`/overtime-submissions/add-work-order`)}`,
    );
  }

  const userRoles = session.user?.roles ?? [];
  const isHROrAdmin = userRoles.includes('hr') || userRoles.includes('admin');

  return (
    <AddWorkOrderForm
      managers={supervisors}
      users={users}
      loggedInUserEmail={session?.user?.email ?? ''}
      mode='new'
      dict={dict}
      lang={lang}
      isHROrAdmin={isHROrAdmin}
    />
  );
}
