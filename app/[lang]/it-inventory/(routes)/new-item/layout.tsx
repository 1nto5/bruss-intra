import { getDictionary } from "../../lib/dict";
import { Locale } from "@/lib/config/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.form.newItem.title} | ${dict.title}`,
  };
}

export default function NewItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex justify-center">{children}</div>;
}
