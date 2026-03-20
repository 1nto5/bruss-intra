"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportCorrectionsToExcel } from "../actions/export";
import type { Dictionary } from "../lib/dict";

interface ExcelExportButtonProps {
  dict: Dictionary;
}

export default function ExcelExportButton({ dict }: ExcelExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportCorrectionsToExcel();

      if ("error" in result) {
        toast.error(dict.errors.contactIT);
        return;
      }

      if (result.success && result.data) {
        const buffer = Buffer.from(result.data, "base64");
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(dict.toast.exported);
      }
    } catch {
      toast.error(dict.errors.contactIT);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
    >
      {isExporting ? (
        <Loader className="animate-spin" />
      ) : (
        <Download />
      )}
      {dict.actions.export}
    </Button>
  );
}
