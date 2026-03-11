import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { hasAdminAccess } from "../../lib/permissions";
import { getAppointment } from "../../lib/get-appointment";
import AppointmentDetail from "../../components/appointment-detail";

export default async function AppointmentDetailPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const roles = session.user.roles || [];
  if (!hasAdminAccess(roles)) redirect("/");

  const { lang, id } = await props.params;

  const [dict, data] = await Promise.all([
    getDictionary(lang),
    getAppointment(id),
  ]);

  return (
    <AppointmentDetail
      appointment={data.appointment}
      history={data.history}
      dict={dict}
    />
  );
}
