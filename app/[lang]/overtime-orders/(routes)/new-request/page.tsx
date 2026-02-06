import { auth } from '@/lib/auth';
import getEmployees from '@/lib/data/get-employees';
import { getUsers } from '@/lib/data/get-users';
import { Locale } from '@/lib/config/i18n';
import getOvertimeDepartments from '@/lib/get-overtime-departments';
import { redirect } from 'next/navigation';
import NewOvertimeRequestForm from '../../components/new-overtime-request-form';
import { getDictionary } from '../../lib/dict';
import getAllArticles from '@/lib/data/get-all-articles';

export default async function AddDeviationPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }
  // Determine access based on user roles: group leader (any role containing "group-leader"), any manager, or admin
  const isGroupLeader =
    session?.user?.roles?.some((role: string) => role.includes('group-leader')) ||
    false;
  const isManager =
    session?.user?.roles?.some((role: string) => role.includes('manager')) || false;
  const isAdmin = session?.user?.roles?.includes('admin') || false;
  const canCreateRequest = isGroupLeader || isManager || isAdmin;
  if (!canCreateRequest) {
    redirect(`/${lang}/overtime-orders`);
  }

  const [dict, employees, users, departments, articles] = await Promise.all([
    getDictionary(lang),
    getEmployees(),
    getUsers(),
    getOvertimeDepartments(),
    getAllArticles(),
  ]);

  return (
    <NewOvertimeRequestForm
      employees={employees}
      users={users}
      departments={departments}
      loggedInUserEmail={session.user.email ?? ''}
      dict={dict}
      lang={lang}
      articles={articles}
    />
  );
}
