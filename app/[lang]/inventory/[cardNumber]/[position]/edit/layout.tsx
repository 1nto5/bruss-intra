import { getDictionary } from '../../../lib/dict';
import { Locale } from '@/lib/config/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.editPage.title} | ${dict.page.title}`,
  };
}

export default function EditPositionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
