import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../lib/dict';
import NewItemForm from '../../components/forms/new-item-form';
import { Locale } from '@/lib/config/i18n';

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/it-inventory`);
  }

  // Only admin can create items
  const hasAdminRole = session.user.roles?.includes('admin');
  if (!hasAdminRole) {
    redirect(`/${lang}/it-inventory`);
  }
  const dict = await getDictionary(lang);

  return <NewItemForm dict={dict} lang={lang} />;
}
