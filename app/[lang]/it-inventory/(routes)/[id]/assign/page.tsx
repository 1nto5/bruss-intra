import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../../lib/dict';
import AssignEmployeeForm from '../../../components/forms/assign-employee-form';
import { getItem } from '../../../actions/crud';
import getEmployees from '@/lib/data/get-employees';
import { Locale } from '@/lib/config/i18n';

export default async function AssignPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/it-inventory`);
  }

  // Only admin can assign items
  const hasAdminRole = session.user.roles?.includes('admin');
  if (!hasAdminRole) {
    redirect(`/${lang}/it-inventory`);
  }

  const item = await getItem(id);
  if (!item) {
    redirect(`/${lang}/it-inventory`);
  }

  const employees = await getEmployees();
  const dict = await getDictionary(lang);

  return <AssignEmployeeForm item={item} employees={employees} dict={dict} lang={lang} />;
}
