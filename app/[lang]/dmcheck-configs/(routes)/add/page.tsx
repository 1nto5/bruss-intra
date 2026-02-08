import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { redirect } from 'next/navigation';
import ConfigForm from '../../components/config-form';
import { getDictionary } from '../../lib/dict';

export default async function AddConfigPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.roles?.includes('admin')) {
    redirect(`/${lang}`);
  }

  return (
    <div className='flex justify-center'>
      <ConfigForm mode='create' dict={dict} lang={lang} />
    </div>
  );
}
