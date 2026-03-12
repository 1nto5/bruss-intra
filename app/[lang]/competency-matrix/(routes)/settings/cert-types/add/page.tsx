export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../../lib/dict";
import { hasFullAccess } from "../../../../lib/permissions";
import { CertTypeForm } from "../../../../components/settings/cert-type-form";

export default async function AddCertTypePage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/settings/cert-types/add`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  return <CertTypeForm dict={dict} lang={lang} />;
}
