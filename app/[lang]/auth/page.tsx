import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '@/lib/dict';
import { Metadata } from 'next';
import LoginForm from './components/login-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.auth.cardTitle} (BRUSS)`,
  };
}

export default async function AuthPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;

  const { lang } = params;

  const dict = await getDictionary(lang);
  return <LoginForm cDict={dict.auth} lang={lang} />;
}
