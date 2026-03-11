"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportAppointments } from "../actions";
import type { Dictionary } from "../lib/dict";

interface ExportButtonsProps {
  dict: Dictionary;
  q: string;
  from: string;
  to: string;
}

export default function ExportButtons({
  dict,
  q,
  from,
  to,
}: ExportButtonsProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(format);
    try {
      const result = await exportAppointments({ q, from, to, format });
      if (result.error) {
        console.error("Export failed:", result.error);
        return;
      }
      if (result.success && result.data) {
        const buffer = Buffer.from(result.data, "base64");
        const mimeType =
          format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        const blob = new Blob([buffer], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || `export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("csv")}
        disabled={exporting !== null}
      >
        <Download className="mr-1 h-4 w-4" />
        {dict.export.csv}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("xlsx")}
        disabled={exporting !== null}
      >
        <Download className="mr-1 h-4 w-4" />
        {dict.export.xlsx}
      </Button>
    </div>
  );
}
