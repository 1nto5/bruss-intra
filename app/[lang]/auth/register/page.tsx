import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '@/lib/dict';
import { Metadata } from 'next';
import RegisterForm from './register-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.auth.registerPage.title} (BRUSS)`,
  };
}

export default async function RegisterPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);

  return <RegisterForm dict={dict.auth.registerPage} lang={lang} />;
}
