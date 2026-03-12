import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/config/i18n";
import { getDictionary } from "./lib/dict";
import { hasAdminAccess, hasProcessAccess } from "./lib/permissions";
import { type AppointmentType } from "./lib/types";
import AvisoPageClient from "./components/aviso-page-client";

async function getAppointments(date: string): Promise<AppointmentType[]> {
  const res = await fetch(`${process.env.API}/aviso?date=${date}`, {
    next: { revalidate: 0, tags: ["aviso-appointments"] },
  });
  if (!res.ok) return [];
  return res.json();
}

function formatDateYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function AvisoPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();

  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang } = params;

  const date = searchParams.date || formatDateYmd();
  const scope =
    (searchParams.scope as
      | "all"
      | "waiting"
      | "yard"
      | "delayed"
      | "departed") || "all";
  const op = (searchParams.op as "all" | "loading" | "unloading") || "all";

  const [dict, appointments] = await Promise.all([
    getDictionary(lang),
    getAppointments(date),
  ]);

  const roles = session?.user?.roles || [];
  const canEdit = hasAdminAccess(roles);
  const canGateOp = hasProcessAccess(roles);

  return (
    <AvisoPageClient
      initialAppointments={appointments}
      date={date}
      scope={scope}
      op={op}
      dict={dict}
      canEdit={canEdit}
      canGateOp={canGateOp}
      userEmail={session?.user?.email || null}
    />
  );
}
