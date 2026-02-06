import { auth } from '@/lib/auth';
import getEmployees from '@/lib/data/get-employees';
import { getUsers } from '@/lib/data/get-users';
import { Locale } from '@/lib/config/i18n';
import { notFound, redirect } from 'next/navigation';
import EditOvertimeRequestForm from '../../components/edit-overtime-request-form';
import { getOvertimeRequestForEdit } from '../../actions';
import { getDictionary } from '../../lib/dict';

export default async function EditOvertimeRequestPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;
  const dict = await getDictionary(lang);
  
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/production-overtime');
  }

  // Get the overtime request
  const overtimeRequest = await getOvertimeRequestForEdit(id);
  
  if (!overtimeRequest) {
    notFound();
  }

  // Get employees and users lists
  const [employees, users] = await Promise.all([
    getEmployees(),
    getUsers(),
  ]);

  return (
    <EditOvertimeRequestForm
      employees={employees}
      users={users}
      overtimeRequest={overtimeRequest}
      dict={dict}
      lang={lang}
    />
  );
}