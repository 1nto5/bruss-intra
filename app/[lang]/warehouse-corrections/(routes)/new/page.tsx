import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { redirect } from "next/navigation";
import CorrectionForm from "../../components/forms/correction-form";
import { getDictionary } from "../../lib/dict";
import {
  fetchQuarries,
  fetchReasons,
  fetchWarehouses,
} from "../../lib/fetchers";

export default async function NewCorrectionPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const session = await auth();

  if (!session) {
    redirect(`/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections/new`);
  }

  const [dict, warehouses, quarries, reasons] = await Promise.all([
    getDictionary(lang),
    fetchWarehouses(),
    fetchQuarries(),
    fetchReasons(),
  ]);

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
    />
  );
}
