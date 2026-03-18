import type { Metadata } from "next";
import { getDictionary } from "../../../lib/dict";
import { Locale } from "@/lib/config/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.form.unassign.title} | ${dict.title}`,
  };
}

export default function UnassignItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex justify-center">{children}</div>;
}
