import { Metadata } from "next";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "./lib/dict";
import { OvenDataProviders } from "./lib/providers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.title} (BRUSS)`,
  };
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OvenDataProviders>{children}</OvenDataProviders>;
}
