import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../lib/dict';
import { canManageCompetencies } from '../../../lib/permissions';
import { CompetencyForm } from '../../../components/competencies/competency-form';

export default async function AddCompetencyPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/competencies/add`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  return <CompetencyForm dict={dict} lang={lang} />;
}
