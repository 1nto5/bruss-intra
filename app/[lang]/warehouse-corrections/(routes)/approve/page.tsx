import NoAccess from "@/components/no-access";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { getDictionary as getGlobalDictionary } from "@/lib/dict";
import { redirect } from "next/navigation";
import { createApprovalColumns } from "../../components/tables/approval-table/columns";
import { DataTable } from "../../components/tables/corrections-table/data-table";
import { getDictionary } from "../../lib/dict";
import { fetchPendingApprovals } from "../../lib/fetchers";
import {
  canAccessApprovalQueue,
  getApprovalRolesForUser,
} from "../../lib/permissions";

export default async function ApproveQueuePage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const session = await auth();

  if (!session) {
    redirect(
      `/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections/approve`,
    );
  }

  const roles = session.user?.roles || [];
  if (!canAccessApprovalQueue(roles)) {
    const globalDict = await getGlobalDictionary(lang);
    return (
      <NoAccess
        title={globalDict.noAccessTitle}
        description={globalDict.noAccess}
      />
    );
  }

  const dict = await getDictionary(lang);
  const userApprovalRoles = getApprovalRolesForUser(roles);
  const corrections = await fetchPendingApprovals(userApprovalRoles);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.approval.title}</CardTitle>
      </CardHeader>
      <DataTable
        columns={createApprovalColumns as any}
        data={corrections}
        session={session}
        dict={dict}
        lang={lang}
      />
    </Card>
  );
}
