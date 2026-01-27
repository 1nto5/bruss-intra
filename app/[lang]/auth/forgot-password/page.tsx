import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '@/lib/dict';
import { Metadata } from 'next';
import ForgotPasswordForm from './forgot-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.auth.forgotPasswordPage.title} (BRUSS)`,
  };
}

export default async function ForgotPasswordPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);

  return <ForgotPasswordForm dict={dict.auth.forgotPasswordPage} lang={lang} />;
}
