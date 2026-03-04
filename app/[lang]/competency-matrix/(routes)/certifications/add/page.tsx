import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../lib/dict';
import { hasFullAccess } from '../../../lib/permissions';
import { CertificationForm } from '../../../components/certifications/certification-form';
import getEmployees from '@/lib/data/get-employees';
import getCertTypes from '@/lib/data/get-cert-types';

export default async function AddCertificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/certifications/add`);
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [employees, certTypes] = await Promise.all([
    getEmployees(),
    getCertTypes(),
  ]);

  const employeeOptions = employees.map((e) => ({
    value: e.identifier,
    label: `${e.lastName} ${e.firstName} (${e.identifier})`,
  }));

  const resolvedSearchParams = await searchParams;
  const defaultEmployee =
    typeof resolvedSearchParams.employee === 'string'
      ? resolvedSearchParams.employee
      : undefined;

  return (
    <CertificationForm
      dict={dict}
      lang={lang}
      employees={employeeOptions}
      certTypes={certTypes}
      defaultEmployee={defaultEmployee}
    />
  );
}
