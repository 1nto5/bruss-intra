export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { localize } from '../../lib/types';
import { isHrOrAdmin } from '../../lib/permissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchCertifications } from './lib/fetch-certifications';
import { fetchCertificationTypes } from '../../lib/fetch-cert-types';
import { CertTableFiltering } from './components/table-filtering';
import { CertificationTable } from './components/certification-table';

export default async function CertificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as
    | 'pl'
    | 'de'
    | 'en';

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/certifications`);
  }

  const userRoles = session.user.roles ?? [];
  if (!isHrOrAdmin(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const resolvedSearchParams = await searchParams;

  const [data, certTypes] = await Promise.all([
    fetchCertifications({
      status:
        typeof resolvedSearchParams.status === 'string'
          ? resolvedSearchParams.status
          : undefined,
      type:
        typeof resolvedSearchParams.type === 'string'
          ? resolvedSearchParams.type
          : undefined,
      employee:
        typeof resolvedSearchParams.employee === 'string'
          ? resolvedSearchParams.employee
          : undefined,
    }),
    fetchCertificationTypes(),
  ]);

  const certTypeOptions = certTypes.map((ct) => ({
    value: ct.slug,
    label: localize(ct.name, safeLang),
  }));

  const fetchTime = new Date();

  return (
    <Card>
      <CardHeader>
        <CertTableFiltering
          dict={dict}
          certTypeOptions={certTypeOptions}
          fetchTime={fetchTime}
        />
      </CardHeader>
      <Separator />
      <CardContent>
        <CertificationTable
          data={data}
          certTypes={certTypes}
          dict={dict}
          lang={lang}
        />
      </CardContent>
    </Card>
  );
}
