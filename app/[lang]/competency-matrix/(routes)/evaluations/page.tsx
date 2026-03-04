import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';

export default async function EvaluationsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/competency-matrix/employees`);
}
