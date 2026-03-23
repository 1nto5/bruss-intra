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

  const reasonOptions = reasons.map((r) =>
    lang === "pl" ? r.pl : lang === "de" ? r.de : r.label,
  );

  return (
    <CorrectionForm
      warehouses={warehouses}
      quarries={quarries}
      reasonOptions={reasonOptions}
      dict={dict}
      lang={lang}
      initialData={correction}
    />
  );
}
