// import { auth } from '@/lib/auth';
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Locale } from "@/lib/config/i18n";
import { formatDate, formatDateTime } from "@/lib/utils/date-format";
import { Table } from "lucide-react";
import LocalizedLink from "@/components/localized-link";
import { ProjectsLocaleStringType } from "../lib/types";
import { ProjectsType } from "../lib/zod";
import { getDictionary } from "../lib/dict";
import TableFilteringAndOptions from "./components/table-filtering-and-options";
import { columns } from "./components/table/columns";
import { DataTable } from "./components/table/data-table";

async function getMonthlyProjectsSummary(
  lang: string,
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  dataLocaleString: ProjectsLocaleStringType[];
}> {
  const filteredSearchParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );

  const queryParams = new URLSearchParams(filteredSearchParams).toString();
  const res = await fetch(
    `${process.env.API}/projects/summary?${queryParams}`,
    {
      next: { revalidate: 0, tags: ["projects"] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getMonthlyProjectsSummary error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get("date") || "");
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  const data: ProjectsType[] = await res.json();
  const dataLocaleString = data.map((data) => {
    return {
      ...data,
      dateLocaleString: data.date ? formatDate(data.date) : "",
    };
  });
  return { fetchTime, fetchTimeLocaleString, dataLocaleString };
}

export default async function ProductionOvertimePage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);

  let fetchTime, fetchTimeLocaleString, dataLocaleString;
  ({ fetchTime, fetchTimeLocaleString, dataLocaleString } =
    await getMonthlyProjectsSummary(lang, searchParams));

  // Calculate total hours
  const totalHours = dataLocaleString.reduce((sum, project) => {
    return sum + (Number(project.time) || 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="space-y-2 sm:flex sm:justify-between sm:gap-4">
          <div>
            <CardTitle>Monthly Summary - Adrian&apos;s Projects</CardTitle>
          </div>
          <LocalizedLink href="/projects">
            <Button variant="outline">
              <Table /> <span>Projects</span>
            </Button>
          </LocalizedLink>
        </div>
        <TableFilteringAndOptions fetchTime={fetchTime} />
        <Alert>
          <AlertTitle>Total in selected month: {totalHours}h</AlertTitle>
        </Alert>
      </CardHeader>
      <DataTable
        columns={columns}
        data={dataLocaleString}
        fetchTimeLocaleString={fetchTimeLocaleString}
        fetchTime={fetchTime}
        dict={dict}
      />
    </Card>
  );
}
