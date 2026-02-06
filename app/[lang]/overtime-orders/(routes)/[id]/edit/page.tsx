import { auth } from '@/lib/auth';
import getEmployees from '@/lib/data/get-employees';
import { getUsers } from '@/lib/data/get-users';
import { Locale } from '@/lib/config/i18n';
import getOvertimeDepartments from '@/lib/get-overtime-departments';
import { notFound, redirect } from 'next/navigation';
import EditOvertimeRequestForm from '../../../components/edit-overtime-request-form';
import { getOvertimeRequestForEdit } from '../../../actions/crud';
import { getDictionary } from '../../../lib/dict';
import getAllArticles from '@/lib/data/get-all-articles';

export default async function EditOvertimeRequestPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }

  // Get the overtime request
  const overtimeRequest = await getOvertimeRequestForEdit(id);

  if (!overtimeRequest) {
    notFound();
  }

  // Get employees, users lists, departments, and articles
  const [dict, employees, users, departments, articles] = await Promise.all([
    getDictionary(lang),
    getEmployees(),
    getUsers(),
    getOvertimeDepartments(),
    getAllArticles(),
  ]);

  return (
    <EditOvertimeRequestForm
      employees={employees}
      users={users}
      departments={departments}
      overtimeRequest={overtimeRequest}
      dict={dict}
      lang={lang}
      articles={articles}
    />
  );
}