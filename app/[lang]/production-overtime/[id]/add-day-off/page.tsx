import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import getEmployees from '@/lib/data/get-employees';
import { redirect } from 'next/navigation';
import AddDayOff from '../../components/add-day-off-form';
import { getOvertimeRequest } from '../../lib/get-overtime-request';
import { getDictionary } from '../../lib/dict';

export default async function AddDayOffPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/production-overtime');
  }
  const access =
    session.user?.roles.some((role: string) => role.includes('group-leader')) ||
    session.user?.roles.includes('plant-manager') ||
    session.user?.roles.includes('admin') ||
    session.user?.roles.includes('hr') ||
    false;
  if (access === false) {
    redirect('/production-overtime');
  }

  // Check overtime request status
  let overtimeRequestLocaleString;
  ({ overtimeRequestLocaleString } = await getOvertimeRequest(lang, id));

  const status = overtimeRequestLocaleString.status;

  // Redirect if status is not valid for adding day off
  if (status !== 'pending' && status !== 'approved') {
    redirect(`/${lang}/production-overtime/${id}`);
  }

  const employees = await getEmployees();
  const dict = await getDictionary(lang);
  return <AddDayOff employees={employees} id={id} dict={dict} lang={lang} />;
}
