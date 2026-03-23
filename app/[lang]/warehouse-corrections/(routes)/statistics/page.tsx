import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { redirect } from "next/navigation";
import CorrectionsByTypeChart from "../../components/charts/corrections-by-type-chart";
import CorrectionsByQuarryChart from "../../components/charts/corrections-by-quarry-chart";
import CorrectionsOverTimeChart from "../../components/charts/corrections-over-time-chart";
import TopArticlesChart from "../../components/charts/top-articles-chart";
import ExcelExportButton from "../../components/excel-export-button";
import { getDictionary } from "../../lib/dict";
import { fetchStatistics } from "../../lib/fetchers";

export default async function StatisticsPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session) {
    redirect(
      `/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections/statistics`,
    );
  }

  const dict = await getDictionary(lang);
  const statistics = await fetchStatistics(searchParams);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{dict.statistics.title}</h1>
        <ExcelExportButton dict={dict} lang={lang} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.statistics.totalCorrections}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {statistics.summary.totalCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.statistics.totalValue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {statistics.summary.totalValue?.toFixed(0)} EUR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.statistics.avgApprovalTime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {statistics.summary.avgApprovalTimeHours} {dict.statistics.hours}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.statistics.scrappingValue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(
                statistics.byType.find((t) => t.type === "scrapping")?.value ||
                0
              ).toFixed(0)}{" "}
              EUR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.statistics.nokValue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(
                statistics.byType.find((t) => t.type === "nok-block")?.value ||
                0
              ).toFixed(0)}{" "}
              EUR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.statistics.rejectionCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {statistics.rejections.reduce((sum, r) => sum + r.count, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.byType}</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrectionsByTypeChart data={statistics.byType} dict={dict} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.byQuarry}</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrectionsByQuarryChart data={statistics.byQuarry} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.overTime}</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrectionsOverTimeChart data={statistics.monthlyTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.topArticles}</CardTitle>
          </CardHeader>
          <CardContent>
            <TopArticlesChart data={statistics.topArticles} />
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <h2 className="text-xl font-semibold">{dict.statistics.dataTables}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Corrections by User */}
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.byUser}</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.byUser.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.statistics.user}</TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.count}
                    </TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.value}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.byUser.map((row) => (
                    <TableRow key={row.user}>
                      <TableCell>{row.user}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">
                        {row.value.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                {dict.common.noData}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rejections by Approver */}
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.rejectionsByApprover}</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.rejections.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.statistics.approver}</TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.count}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.rejections.map((row) => (
                    <TableRow key={row.rejectedBy}>
                      <TableCell>{row.rejectedBy}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                {dict.common.noData}
              </p>
            )}
          </CardContent>
        </Card>

        {/* By Department (Quarry) */}
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.byQuarry}</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.byQuarry.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.filters.quarry}</TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.quantity}
                    </TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.value}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.byQuarry.map((row) => (
                    <TableRow key={row.quarry}>
                      <TableCell>{row.quarry}</TableCell>
                      <TableCell className="text-right">
                        {row.totalQuantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalValue.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                {dict.common.noData}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Articles */}
        <Card>
          <CardHeader>
            <CardTitle>{dict.statistics.topArticles}</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.topArticles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.statistics.articleNumber}</TableHead>
                    <TableHead>{dict.statistics.articleName}</TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.quantity}
                    </TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.value}
                    </TableHead>
                    <TableHead className="text-right">
                      {dict.statistics.count}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.topArticles.map((row) => (
                    <TableRow key={row.articleNumber}>
                      <TableCell>{row.articleNumber}</TableCell>
                      <TableCell>{row.articleName}</TableCell>
                      <TableCell className="text-right">
                        {row.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.value.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                {dict.common.noData}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
