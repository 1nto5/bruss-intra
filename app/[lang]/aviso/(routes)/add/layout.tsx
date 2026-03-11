import type { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: `${dict.form.create} (BRUSS)` };
}

export default async function Layout(props: { children: React.ReactNode }) {
  const { children } = props;

  const session = await auth();
  if (!session) {
    redirect("/auth?callbackUrl=/aviso");
  }

  return <div className="flex justify-center">{children}</div>;
}
