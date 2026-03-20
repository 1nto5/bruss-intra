import LocalizedLink from "@/components/localized-link";
import NoAccess from "@/components/no-access";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { getDictionary as getGlobalDictionary } from "@/lib/dict";
import { getUsers } from "@/lib/data/get-users";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import ImportArticlesDialog from "./components/dialogs/import-articles-dialog";
import TableFilteringAndOptions from "./components/table-filtering";
import { createColumns } from "./components/tables/corrections-table/columns";
import { DataTable } from "./components/tables/corrections-table/data-table";
import { getDictionary } from "./lib/dict";
import {
  fetchCorrections,
  fetchQuarries,
  fetchWarehouses,
} from "./lib/fetchers";
import { canAccessModule, canViewAllCorrections } from "./lib/permissions";

export default async function WarehouseCorrectionsPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session) {
    redirect(`/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections`);
  }

  if (!canAccessModule(session.user?.roles || [])) {
    const globalDict = await getGlobalDictionary(lang);
    return (
      <NoAccess
        title={globalDict.noAccessTitle}
        description={globalDict.noAccess}
      />
    );
  }

  // Non-admin/non-manager users only see their own drafts + all non-draft corrections
  const canSeeAll = canViewAllCorrections(session.user?.roles || []);
  const [corrections, quarries, warehouses, users] = await Promise.all([
    fetchCorrections({
      ...searchParams,
      ...(!canSeeAll && { userEmail: session.user?.email || "" }),
    }),
    fetchQuarries(),
    fetchWarehouses(),
    getUsers(),
  ]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{dict.title}</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {session.user?.roles?.includes("admin") && (
              <ImportArticlesDialog dict={dict} />
            )}
            <LocalizedLink href="/warehouse-corrections/new">
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus /> <span>{dict.form.title}</span>
              </Button>
            </LocalizedLink>
          </div>
        </div>
        <TableFilteringAndOptions
          dict={dict}
          quarries={quarries}
          warehouses={warehouses}
          users={users}
          fetchTime={new Date()}
        />
      </CardHeader>
      <DataTable
        columns={createColumns}
        data={corrections}
        session={session}
        dict={dict}
        lang={lang}
      />
    </Card>
  );
}
