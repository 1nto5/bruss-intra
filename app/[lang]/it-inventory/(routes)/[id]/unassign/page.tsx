import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../../lib/dict';
import UnassignEmployeeForm from '../../../components/forms/unassign-employee-form';
import { getItem } from '../../../actions/crud';
import { Locale } from '@/lib/config/i18n';

export default async function UnassignPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  // Only admin can unassign items
  const hasAdminRole = session.user.roles?.includes('admin');
  if (!hasAdminRole) {
    redirect('/unauthorized');
  }

  const { lang, id } = await params;

  const item = await getItem(id);
  if (!item) {
    redirect(`/${lang}/it-inventory`);
  }

  const dict = await getDictionary(lang);

  return <UnassignEmployeeForm item={item} dict={dict} lang={lang} />;
}
