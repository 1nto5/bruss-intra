import NoAccess from "@/components/no-access";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { getDictionary as getGlobalDictionary } from "@/lib/dict";
import { redirect } from "next/navigation";
import CorrectionForm from "../../../components/forms/correction-form";
import { getDictionary } from "../../../lib/dict";
import {
  fetchCorrection,
  fetchQuarries,
  fetchReasons,
  fetchWarehouses,
} from "../../../lib/fetchers";
import { canEditCorrection } from "../../../lib/permissions";

export default async function EditCorrectionPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;
  const session = await auth();

  if (!session) {
    redirect(
      `/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections/${id}/edit`,
    );
  }

  const [dict, correction, warehouses, quarries, reasons] = await Promise.all([
    getDictionary(lang),
    fetchCorrection(id),
    fetchWarehouses(),
    fetchQuarries(),
    fetchReasons(),
  ]);

  if (
    !canEditCorrection(
      session.user?.roles || [],
      session.user?.email || "",
      correction,
    ) ||
    (correction.status === "in-approval" &&
      correction.approvals?.some((a) => a.status === "approved"))
  ) {
    const globalDict = await getGlobalDictionary(lang);
    return (
      <NoAccess
        title={globalDict.noAccessTitle}
        description={globalDict.noAccess}
      />
    );
  }

  // Translate stored reason (raw value or any-language label) to current language label
  const match = reasons.find(
    (r) =>
      r.value === correction.reason ||
      r.label === correction.reason ||
      r.pl === correction.reason ||
      r.de === correction.reason,
  );
  const translatedReason = match
    ? lang === "pl" ? match.pl : lang === "de" ? match.de : match.label
    : correction.reason;

  return (
    <CorrectionForm
      warehouses={warehouses}
      quarries={quarries}
      reasons={reasons}
      dict={dict}
      lang={lang}
      initialData={{ ...correction, reason: translatedReason }}
    />
  );
}
