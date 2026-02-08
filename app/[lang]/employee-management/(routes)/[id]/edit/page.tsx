import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { plant } from '@/lib/config/plant';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import EmployeeForm from '../../../components/employee-form';
import { getDictionary } from '../../../lib/dict';
import { ManagedEmployee } from '../../../lib/types';

export default async function EditEmployeePage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await props.params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.roles?.includes('admin')) {
    redirect(`/${lang}`);
  }
  if (plant !== 'bri') {
    redirect(`/${lang}`);
  }

  const coll = await dbc('employees');
  const doc = await coll.findOne({ _id: new ObjectId(id) });

  if (!doc) {
    redirect(`/${lang}/employee-management`);
  }

  const employee: ManagedEmployee = {
    _id: doc._id.toString(),
    identifier: doc.identifier,
    firstName: doc.firstName,
    lastName: doc.lastName,
  };

  return (
    <div className='flex justify-center'>
      <EmployeeForm mode='edit' employee={employee} dict={dict} lang={lang} />
    </div>
  );
}
