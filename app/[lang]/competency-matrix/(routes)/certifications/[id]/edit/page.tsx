import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../../lib/dict';
import { COLLECTIONS } from '../../../../lib/constants';
import { hasFullAccess } from '../../../../lib/permissions';
import { CertificationForm } from '../../../../components/certifications/certification-form';
import getEmployees from '@/lib/data/get-employees';
import getCertTypes from '@/lib/data/get-cert-types';

export default async function EditCertificationPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/certifications/${id}/edit`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [certDoc, employees, certTypes] = await Promise.all([
    dbc(COLLECTIONS.employeeCertifications).then((coll) =>
      coll.findOne({ _id: new ObjectId(id) }),
    ),
    getEmployees(),
    getCertTypes(),
  ]);

  if (!certDoc) notFound();

  const employee = employees.find(
    (e) => e.identifier === certDoc.employeeIdentifier,
  );
  const employeeName = employee
    ? `${employee.lastName} ${employee.firstName} (${employee.identifier})`
    : certDoc.employeeIdentifier;

  const employeeOptions = employees.map((e) => ({
    value: e.identifier,
    label: `${e.lastName} ${e.firstName} (${e.identifier})`,
  }));

  const certification = {
    _id: certDoc._id.toString(),
    employeeIdentifier: certDoc.employeeIdentifier as string,
    employeeName,
    certificationType: certDoc.certificationType as string,
    issuedDate: certDoc.issuedDate,
    expirationDate: certDoc.expirationDate,
    documentRef: certDoc.documentRef as string | undefined,
    notes: certDoc.notes as string | undefined,
  };

  return (
    <CertificationForm
      dict={dict}
      lang={lang}
      employees={employeeOptions}
      certTypes={certTypes}
      certification={certification}
    />
  );
}
