import { OvenProcessDataType } from "@/app/[lang]/oven-data/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/lib/config/i18n";
import { formatDateTime } from "@/lib/utils/date-format";

import { RefreshButton } from "@/components/refresh-button";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import LocalizedLink from "@/components/localized-link";
import { revalidateOvenTableData } from "./actions";
import OvenDataWithChart from "./components/oven-data-with-chart";
import OvenTableFilteringAndOptions from "./components/table-filtering-and-options";
import { getDictionary } from "./lib/dict";
import { getOvens } from "./lib/get-ovens";
import { getOvenProcesses } from "./lib/get-oven-processes";

export default async function OvenDataPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { lang } = params;
  const dict = await getDictionary(lang);

  let fetchTime, fetchTimeLocaleString, data;
  ({ fetchTime, fetchTimeLocaleString, data } =
    await getOvenProcesses(searchParams));
  const ovens = await getOvens();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{dict.title}</CardTitle>
            <CardDescription>
              {dict.lastSync}: {fetchTimeLocaleString}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <LocalizedLink href="/oven-data/oee">
              <Button variant="outline" className="w-full sm:w-auto">
                <BarChart3 />
                <span>{dict.oee}</span>
              </Button>
            </LocalizedLink>
            <RefreshButton
              fetchTime={fetchTime}
              onRefresh={revalidateOvenTableData}
              label={dict.refresh}
            />
          </div>
        </div>
        <OvenTableFilteringAndOptions
          ovens={ovens}
          fetchTime={fetchTime}
          dict={dict}
        />
      </CardHeader>
      <CardContent>
        <OvenDataWithChart
          data={data}
          ovens={ovens}
          fetchTime={fetchTime}
          fetchTimeLocaleString={fetchTimeLocaleString}
          lang={lang}
          dict={dict}
          searchParams={searchParams}
        />
      </CardContent>
    </Card>
  );
}
