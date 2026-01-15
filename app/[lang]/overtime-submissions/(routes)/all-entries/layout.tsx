import type { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: dict.allEntriesPage?.pageTitle || 'All Overtime Entries' };
}

export default function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <>{children}</>;
}
