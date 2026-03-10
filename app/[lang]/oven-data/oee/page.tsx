import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/lib/config/i18n";
import OeeFilteringAndOptions from "../components/oee-filtering-and-options";
import OeeHeaderButtons from "../components/oee-header-buttons";
import OeeSummaryCards from "../components/oee-summary-cards";
import OeeUtilizationChart from "../components/oee-utilization-chart";
import { getDictionary } from "../lib/dict";

export default async function OvenOeePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const dict = await getDictionary(lang);

  // Extract time selection parameters
  const mode = sp.mode || "range";

  // Build params object based on mode
  let oeeParams:
    | { mode: "day"; date: string }
    | { mode: "week"; year: number; week: number }
    | { mode: "month"; year: number; month: number }
    | { mode: "range"; from: string; to: string; granularity?: "hour" | "day" }
    | null = null;

  switch (mode) {
    case "day":
      if (sp.date) {
        oeeParams = { mode: "day", date: sp.date };
      } else {
        // Default to today
        oeeParams = {
          mode: "day",
          date: new Date().toISOString().split("T")[0],
        };
      }
      break;

    case "week":
      const year = sp.year ? parseInt(sp.year) : new Date().getFullYear();
      const week = sp.week ? parseInt(sp.week) : 1;
      oeeParams = { mode: "week", year, week };
      break;

    case "month":
      const mYear = sp.year ? parseInt(sp.year) : new Date().getFullYear();
      const month = sp.month ? parseInt(sp.month) : new Date().getMonth() + 1;
      oeeParams = { mode: "month", year: mYear, month };
      break;

    case "range":
    default:
      // Default: last 30 days
      const to = sp.to || new Date().toISOString().split("T")[0];
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      const from = sp.from || defaultFrom.toISOString().split("T")[0];
      oeeParams = { mode: "range", from, to };
      break;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{dict.oeeTitle}</CardTitle>
            <CardDescription>{dict.oeeDescription}</CardDescription>
          </div>
          <OeeHeaderButtons lang={lang} dict={dict} />
        </div>
        <OeeFilteringAndOptions dict={dict} />
      </CardHeader>
      <CardContent className="space-y-6">
        {oeeParams && (
          <>
            <OeeSummaryCards params={oeeParams} dict={dict} />
            <OeeUtilizationChart params={oeeParams} lang={lang} dict={dict} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
