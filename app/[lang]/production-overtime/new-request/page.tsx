import { auth } from '@/lib/auth';
import getEmployees from '@/lib/data/get-employees';
import { getUsers } from '@/lib/data/get-users';
import { Locale } from '@/lib/config/i18n';
import { redirect } from 'next/navigation';
import NewOvertimeRequestForm from '../components/new-overtime-request-form';
import { getDictionary } from '../lib/dict';

export default async function AddDeviationPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const employees = await getEmployees();
  const users = await getUsers();
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/production-overtime');
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
    redirect('/production-overtime');
  }

  return (
    <NewOvertimeRequestForm
      employees={employees}
      users={users}
      loggedInUserEmail={session.user.email ?? ''}
      dict={dict}
      lang={lang}
    />
  );
}
