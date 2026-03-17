import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDictionary } from "./lib/dict";
import LocalizedLink from "@/components/localized-link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Locale } from "@/lib/config/i18n";
import TableFiltering from "./components/table-filtering";
import InventoryTableWrapper from "./components/table/inventory-table-wrapper";
import { getInventoryItems } from "./lib/fetchers";
import getEmployees from "@/lib/data/get-employees";

export default async function ITInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang } = await params;

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/it-inventory`);
  }

  // Check roles for access
  const hasAdminRole = session.user.roles?.includes("admin");
  const hasManagerRole = session.user.roles?.some((role) =>
    role.toLowerCase().includes("manager"),
  );
  const canView = hasAdminRole || hasManagerRole;
  const canManage = hasAdminRole;

  if (!canView) {
    redirect(`/${lang}`);
  }

  const dict = await getDictionary(lang);
  const search = await searchParams;

  // Convert searchParams to URLSearchParams
  const urlSearchParams = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => urlSearchParams.append(key, v));
      } else {
        urlSearchParams.set(key, value);
      }
    }
  });

  const [{ items, fetchTime }, employees] = await Promise.all([
    getInventoryItems(urlSearchParams),
    getEmployees(),
  ]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{dict.page.title}</CardTitle>
          {canManage && (
            <LocalizedLink href="/it-inventory/new-item">
              <Button variant="outline">
                <Plus /> <span>{dict.page.newItem}</span>
              </Button>
            </LocalizedLink>
          )}
        </div>

        {/* Filters - Horizontal Layout */}
        <TableFiltering
          dict={dict}
          lang={lang}
          fetchTime={fetchTime}
          employees={employees}
        />
      </CardHeader>

      {/* Data Table */}
      <InventoryTableWrapper
        items={items}
        session={session}
        dict={dict}
        lang={lang}
      />
    </Card>
  );
}
