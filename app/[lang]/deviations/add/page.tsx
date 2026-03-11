import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../lib/dict";

import AddDeviationForm from "../components/add-form";
import {
  getConfigAreaOptions,
  getConfigReasonOptions,
} from "../lib/get-configs";

export default async function AddDeviationPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;

  const dict = await getDictionary(lang);
  const reasonOptions = await getConfigReasonOptions();
  const areaOptions = await getConfigAreaOptions();

  return (
    <AddDeviationForm
      reasonOptions={reasonOptions}
      areaOptions={areaOptions}
      lang={lang}
      dict={dict}
    />
  );
}
