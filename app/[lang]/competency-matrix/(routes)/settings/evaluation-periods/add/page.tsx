import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../../lib/dict';
import { isHrOrAdmin } from '../../../../lib/permissions';
import { EvaluationPeriodForm } from '../../../../components/settings/evaluation-period-form';

export default async function AddEvaluationPeriodPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/settings/evaluation-periods/add`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!isHrOrAdmin(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  return <EvaluationPeriodForm dict={dict} lang={lang} />;
}
