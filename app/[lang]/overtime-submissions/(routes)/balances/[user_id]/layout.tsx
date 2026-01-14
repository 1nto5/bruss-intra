import type { Locale } from '@/lib/config/i18n';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { getDictionary } from '../../../lib/dict';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; user_id: string }>;
}) {
  const { lang, user_id } = await params;
  const dict = await getDictionary(lang);
  const employeeName = extractNameFromEmail(decodeURIComponent(user_id));
  const title =
    dict.balancesPage?.employeeDetailTitle?.replace('{name}', employeeName) ||
    `Overtime for ${employeeName}`;
  return { title: `${title} (BRUSS)` };
}

export default function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <>{children}</>;
}
