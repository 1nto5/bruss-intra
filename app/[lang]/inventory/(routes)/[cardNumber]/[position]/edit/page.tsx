import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../../lib/dict';
import { getInventoryPosition } from '@/lib/data/get-inventory-position';
import EditPositionForm from './edit-position-form';

export default async function EditPositionPage(props: {
  params: Promise<{ lang: Locale; cardNumber: string; position: string }>;
}) {
  const session = await auth();
  const params = await props.params;
  const { lang, cardNumber, position } = params;

  if (!session) {
    redirect(`/${lang}/auth`);
  }

  const positionData = await getInventoryPosition(
    Number(cardNumber),
    Number(position),
  );

  if (!positionData) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return (
    <EditPositionForm
      position={positionData}
      dict={dict}
      lang={lang}
      cardNumber={cardNumber}
    />
  );
}
