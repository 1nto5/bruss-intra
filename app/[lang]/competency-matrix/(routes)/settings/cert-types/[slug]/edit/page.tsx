export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../../../lib/dict";
import { hasFullAccess } from "../../../../../lib/permissions";
import { fetchCertificationTypes } from "../../../../../lib/fetch-cert-types";
import { CertTypeForm } from "../../../../../components/settings/cert-type-form";

export default async function EditCertTypePage({
  params,
}: {
  params: Promise<{ lang: Locale; slug: string }>;
}) {
  const { lang, slug } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/settings/cert-types/${slug}/edit`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const certTypes = await fetchCertificationTypes();
  const certType = certTypes.find((ct) => ct.slug === slug);

  if (!certType) {
    notFound();
  }

  return <CertTypeForm dict={dict} lang={lang} certType={certType} />;
}
