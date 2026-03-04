export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../lib/dict';
import { hasFullAccess } from '../../../lib/permissions';
import { fetchCertificationTypes } from '../../../lib/fetch-cert-types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CertTypeFiltering } from './components/table-filtering';
import { CertTypesTable } from '../../../components/settings/cert-types-table';

export default async function CertTypesPage({
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
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/settings/cert-types`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const resolvedSearchParams = await searchParams;
  let certTypes = await fetchCertificationTypes();

  // Server-side filtering
  const nameParam =
    typeof resolvedSearchParams.name === 'string'
      ? resolvedSearchParams.name
      : undefined;
  if (nameParam) {
    const search = nameParam.toLowerCase();
    certTypes = certTypes.filter((ct) => {
      const pl = ct.name.pl?.toLowerCase() || '';
      const en = ct.name.en?.toLowerCase() || '';
      const de = ct.name.de?.toLowerCase() || '';
      return pl.includes(search) || en.includes(search) || de.includes(search);
    });
  }

  const fetchTime = new Date();

  return (
    <Card>
      <CardHeader>
        <CertTypeFiltering dict={dict} fetchTime={fetchTime} />
      </CardHeader>
      <Separator />
      <CardContent>
        <CertTypesTable certTypes={certTypes} dict={dict} lang={lang} />
      </CardContent>
    </Card>
  );
}
