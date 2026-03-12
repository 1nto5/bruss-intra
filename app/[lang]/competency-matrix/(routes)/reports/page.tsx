export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { COLLECTIONS } from "../../lib/constants";
import { hasFullAccess, isManager } from "../../lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/reports`);
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles) && !isManager(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const employeesColl = await dbc(COLLECTIONS.employees);

  // Employee count by department
  const deptStats = await employeesColl
    .aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict.reports.title}</CardTitle>
          <CardDescription>{dict.reports.departmentMap}</CardDescription>
        </CardHeader>
        <CardContent>
          {deptStats.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.positions.department}</TableHead>
                    <TableHead>{dict.employees.title}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptStats.map((dept) => (
                    <TableRow key={dept._id || "unknown"}>
                      <TableCell className="font-medium">
                        {dept._id || "-"}
                      </TableCell>
                      <TableCell>{dept.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{dict.noData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
