export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { COLLECTIONS, CERTIFICATION_TYPE_LABELS } from '../../lib/constants';
import { localize } from '../../lib/types';
import type { CertificationType } from '../../lib/types';
import { isHrOrAdmin } from '../../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function CertificationsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/certifications`);
  }

  const userRoles = session.user.roles ?? [];
  if (!isHrOrAdmin(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [certsColl, employeesColl] = await Promise.all([
    dbc(COLLECTIONS.employeeCertifications),
    dbc(COLLECTIONS.employees),
  ]);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get expiring and expired certifications
  const certifications = await certsColl
    .find({
      expirationDate: { $ne: null },
    })
    .sort({ expirationDate: 1 })
    .toArray();

  // Get employee names
  const identifiers = [...new Set(certifications.map((c) => c.employeeIdentifier))];
  const employees = await employeesColl
    .find({ identifier: { $in: identifiers } })
    .project({ identifier: 1, firstName: 1, lastName: 1 })
    .toArray();
  const empMap = new Map(
    employees.map((e) => [e.identifier, `${e.firstName} ${e.lastName}`]),
  );

  const expiring = certifications.filter(
    (c) =>
      c.expirationDate &&
      new Date(c.expirationDate) >= now &&
      new Date(c.expirationDate) <= thirtyDaysFromNow,
  );

  const expired = certifications.filter(
    (c) => c.expirationDate && new Date(c.expirationDate) < now,
  );

  return (
    <div className="space-y-6">
      {/* Expiring Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dict.certifications.expiringSoon}
            {expiring.length > 0 && (
              <Badge variant="statusOverdue">{expiring.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiring.length > 0 ? (
            <CertTable
              certs={expiring}
              empMap={empMap}
              dict={dict}
              lang={safeLang}
              now={now}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {dict.dashboard.noExpiringCerts}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expired */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dict.certifications.expired}
            {expired.length > 0 && (
              <Badge variant="statusRejected">{expired.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expired.length > 0 ? (
            <CertTable
              certs={expired}
              empMap={empMap}
              dict={dict}
              lang={safeLang}
              now={now}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{dict.noData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CertTable({
  certs,
  empMap,
  dict,
  lang,
  now,
}: {
  certs: Array<Record<string, unknown>>;
  empMap: Map<string, string>;
  dict: Awaited<ReturnType<typeof getDictionary>>;
  lang: 'pl' | 'de' | 'en';
  now: Date;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.employees.name}</TableHead>
            <TableHead>{dict.certifications.type}</TableHead>
            <TableHead>{dict.certifications.expirationDate}</TableHead>
            <TableHead>{dict.certifications.daysLeft}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certs.map((cert) => {
            const expDate = new Date(cert.expirationDate as string);
            const daysLeft = Math.ceil(
              (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return (
              <TableRow key={(cert._id as { toString: () => string }).toString()}>
                <TableCell>
                  {empMap.get(cert.employeeIdentifier as string) ||
                    (cert.employeeIdentifier as string)}
                </TableCell>
                <TableCell>
                  {localize(
                    CERTIFICATION_TYPE_LABELS[
                      cert.certificationType as CertificationType
                    ],
                    lang,
                  ) || (cert.certificationType as string)}
                </TableCell>
                <TableCell>{expDate.toLocaleDateString()}</TableCell>
                <TableCell>
                  {daysLeft >= 0 ? (
                    <span className="text-amber-600 font-medium">
                      {daysLeft} {dict.certifications.daysLeft}
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      {dict.certifications.expired}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
