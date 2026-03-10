import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../lib/dict";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DeviationView from "../components/view";
import {
  getConfigAreaOptions,
  getConfigReasonOptions,
} from "../lib/get-configs";
import { getDeviation } from "../lib/get-deviation";

export default async function EditDeviationPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;

  const { lang, id } = params;

  const dict = await getDictionary(lang);
  const { fetchTime, deviation } = await getDeviation(id);
  if (deviation === null) {
    redirect("/deviations");
  }
  const session = await auth();
  const reasonOptions = await getConfigReasonOptions();
  const areaOptions = await getConfigAreaOptions();

  return (
    <DeviationView
      deviation={deviation}
      lang={lang}
      session={session}
      fetchTime={fetchTime}
      reasonOptions={reasonOptions}
      areaOptions={areaOptions}
      dict={dict}
    />
  );
}
