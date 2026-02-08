import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { plant } from '@/lib/config/plant';
import { redirect } from 'next/navigation';
import EmployeeForm from '../../components/employee-form';
import { getDictionary } from '../../lib/dict';

export default async function AddEmployeePage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.roles?.includes('admin')) {
    redirect(`/${lang}`);
  }
  if (plant !== 'bri') {
    redirect(`/${lang}`);
  }

  return (
    <div className='flex justify-center'>
      <EmployeeForm mode='create' dict={dict} lang={lang} />
    </div>
  );
}
