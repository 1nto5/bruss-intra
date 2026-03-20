import NoAccess from "@/components/no-access";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { getDictionary as getGlobalDictionary } from "@/lib/dict";
import { redirect } from "next/navigation";
import { createPostingColumns } from "../../components/tables/posting-table/columns";
import { DataTable } from "../../components/tables/corrections-table/data-table";
import { getDictionary } from "../../lib/dict";
import { fetchCorrections } from "../../lib/fetchers";
import { canAccessPostingQueue } from "../../lib/permissions";

export default async function PostingQueuePage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const session = await auth();

  if (!session) {
    redirect(
      `/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections/post`,
    );
  }

  if (!canAccessPostingQueue(session.user?.roles || [])) {
    const globalDict = await getGlobalDictionary(lang);
    return (
      <NoAccess
        title={globalDict.noAccessTitle}
        description={globalDict.noAccess}
      />
    );
  }

  const dict = await getDictionary(lang);
  const corrections = await fetchCorrections({ status: "approved" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.posting.title}</CardTitle>
      </CardHeader>
      <DataTable
        columns={createPostingColumns as any}
        data={corrections}
        session={session}
        dict={dict}
        lang={lang}
      />
    </Card>
  );
}
