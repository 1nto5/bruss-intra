"use client";

import { Locale } from "@/lib/config/i18n";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { OvenProcessDataType } from "../lib/types";
import { getOvenColumns } from "../table/columns";
import { OvenDataTable } from "../table/data-table";
import ChartErrorState from "./chart-error-state";
import OvenTemperatureChart from "./temperature-chart";
import type { Dictionary } from "../lib/dict";

interface OvenDataWithChartProps {
  data: OvenProcessDataType[];
  ovens: string[];
  fetchTime: Date;
  fetchTimeLocaleString: string;
  lang: Locale;
  dict: Dictionary;
  searchParams: { [key: string]: string | undefined };
}

export default function OvenDataWithChart({
  data,
  ovens,
  fetchTime,
  fetchTimeLocaleString,
  lang,
  dict,
  searchParams,
}: OvenDataWithChartProps) {
  const [selectedProcess, setSelectedProcess] =
    useState<OvenProcessDataType | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {dict.processTable.clickToViewChart}
      </p>
      <OvenDataTable
        columns={getOvenColumns(dict)}
        data={data}
        ovens={ovens}
        fetchTime={fetchTime}
        fetchTimeLocaleString={fetchTimeLocaleString}
        lang={lang}
        dict={dict}
        onProcessSelect={setSelectedProcess}
      />
      {/* ErrorBoundary for graceful error handling */}
      <ErrorBoundary
        FallbackComponent={ChartErrorState}
        onReset={() => setSelectedProcess(null)}
        resetKeys={[selectedProcess?.id]}
      >
        <OvenTemperatureChart
          selectedProcess={selectedProcess}
          lang={lang}
          dict={dict}
        />
      </ErrorBoundary>
    </div>
  );
}
