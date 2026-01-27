import type { Locale } from '@/lib/config/i18n';
import { getDictionary } from './lib/dict';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: `${dict.title} (BRUSS)` };
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='flex justify-center'>{children}</div>;
}
