import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import ConfigForm from '../../../components/config-form';
import { getDictionary } from '../../../lib/dict';
import { DmcheckConfigFull } from '../../../lib/types';

export default async function EditConfigPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await props.params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.roles?.includes('admin')) {
    redirect(`/${lang}`);
  }

  const coll = await dbc('dmcheck_configs');
  const doc = await coll.findOne({ _id: new ObjectId(id) });

  if (!doc) {
    redirect(`/${lang}/dmcheck-configs`);
  }

  const config: DmcheckConfigFull = {
    ...doc,
    _id: doc._id.toString(),
  } as DmcheckConfigFull;

  return (
    <div className='flex justify-center'>
      <ConfigForm mode='edit' config={config} dict={dict} lang={lang} />
    </div>
  );
}
