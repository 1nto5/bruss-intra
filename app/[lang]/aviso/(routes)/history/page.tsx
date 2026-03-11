import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { hasAdminAccess } from "../../lib/permissions";
import HistoryFilters from "./components/history-filters";
import { AppointmentsDataTable } from "./components/table/data-table";
import ExportButtons from "../../components/export-buttons";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import LocalizedLink from "@/components/localized-link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function getHistoryData(q: string, from: string, to: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await fetch(
    `${process.env.API}/aviso/history?${params.toString()}`,
    {
      next: { revalidate: 0, tags: ["aviso-appointments"] },
    },
  );
  if (!res.ok) return { appointments: [], history: [] };
  return res.json();
}

export default async function HistoryPage(props: {
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

  const q = searchParams.q || "";
  const from = searchParams.from || "";
  const to = searchParams.to || "";

  const [dict, data] = await Promise.all([
    getDictionary(lang),
    getHistoryData(q, from, to),
  ]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{dict.history.title}</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <LocalizedLink href="/aviso">
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft /> <span>{dict.history.backToBoard}</span>
              </Button>
            </LocalizedLink>
            <ExportButtons dict={dict} q={q} from={from} to={to} />
          </div>
        </div>
        <HistoryFilters dict={dict} q={q} from={from} to={to} />
      </CardHeader>

      <AppointmentsDataTable data={data.appointments} dict={dict} />
    </Card>
  );
}
