import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { hasAdminAccess } from "../../lib/permissions";
import AddAppointmentForm from "../../components/add-appointment-form";

export default async function AddAppointmentPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const roles = session.user.roles || [];
  if (!hasAdminAccess(roles)) redirect("/");

  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang } = params;

  const dict = await getDictionary(lang);
  const defaultDate = searchParams.date || undefined;

  return (
    <AddAppointmentForm dict={dict} lang={lang} defaultDate={defaultDate} />
  );
}
