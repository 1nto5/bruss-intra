import { Metadata } from "next";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../lib/dict";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.correctPage.title} (BRUSS)`,
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center">{children}</div>;
}
