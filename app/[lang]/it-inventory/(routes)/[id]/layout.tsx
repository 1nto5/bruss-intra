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
    title: `${dict.details.title} | ${dict.title}`,
  };
}

export default function ItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
