import NewEntryForm from "./components/new-entry-form";
import { Locale } from "@/lib/config/i18n";

export default async function AddDeviationPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;

  return <NewEntryForm lang={lang} />;
}
