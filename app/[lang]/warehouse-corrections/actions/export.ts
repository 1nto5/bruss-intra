"use server";

import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { dbc } from "@/lib/db/mongo";
import ExcelJS from "exceljs";

export async function exportCorrectionsToExcel(lang: Locale): Promise<
  | { success: true; data: string; filename: string }
  | { error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { error: "unauthorized" };
    }

    const [collection, reasonsColl] = await Promise.all([
      dbc("wh_corrections"),
      dbc("wh_corrections_reasons"),
    ]);
    const [corrections, reasons] = await Promise.all([
      collection
        .find({ status: { $ne: "draft" } })
        .sort({ createdAt: -1 })
        .toArray(),
      reasonsColl.find({ active: true }).toArray(),
    ]);

    const translateReason = (storedReason: string): string => {
      const match = reasons.find(
        (r) =>
          r.value === storedReason ||
          r.label === storedReason ||
          r.pl === storedReason ||
          r.de === storedReason,
      );
      if (!match) return storedReason;
      return lang === "pl" ? match.pl : lang === "de" ? match.de : match.label;
    };

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Corrections list (one row per line item)
    const sheet = workbook.addWorksheet("Corrections");
    sheet.columns = [
      { header: "Correction Number", key: "correctionNumber", width: 18 },
      { header: "Type", key: "type", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Created By", key: "createdBy", width: 30 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Article Number", key: "articleNumber", width: 18 },
      { header: "Article Name", key: "articleName", width: 30 },
      { header: "Quarry", key: "quarry", width: 15 },
      { header: "Batch", key: "batch", width: 15 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Source WH", key: "sourceWarehouse", width: 12 },
      { header: "Target WH", key: "targetWarehouse", width: 12 },
      { header: "Unit Price", key: "unitPrice", width: 12 },
      { header: "Value", key: "value", width: 12 },
      { header: "Reason", key: "reason", width: 20 },
      { header: "Total Value", key: "totalValue", width: 14 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    for (const correction of corrections) {
      if (correction.items && correction.items.length > 0) {
        for (const item of correction.items) {
          sheet.addRow({
            correctionNumber: correction.correctionNumber,
            type: correction.type,
            status: correction.status,
            createdBy: correction.createdBy,
            createdAt: correction.createdAt
              ? new Date(correction.createdAt).toISOString()
              : "",
            articleNumber: item.articleNumber,
            articleName: item.articleName,
            quarry: item.quarry || "",
            batch: item.batch,
            quantity: item.quantity,
            sourceWarehouse: correction.sourceWarehouse,
            targetWarehouse: correction.targetWarehouse,
            unitPrice: item.unitPrice,
            value: item.value,
            reason: translateReason(correction.reason || correction.items?.[0]?.reason || ""),
            totalValue: correction.totalValue,
          });
        }
      }
    }

    // Sheet 2: Summary
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Type", key: "type", width: 15 },
      { header: "Count", key: "count", width: 10 },
      { header: "Total Value", key: "totalValue", width: 15 },
    ];
    summarySheet.getRow(1).font = { bold: true };

    const typeCounts: Record<string, { count: number; value: number }> = {};
    for (const correction of corrections) {
      if (!typeCounts[correction.type]) {
        typeCounts[correction.type] = { count: 0, value: 0 };
      }
      typeCounts[correction.type].count++;
      typeCounts[correction.type].value += correction.totalValue || 0;
    }

    for (const [type, data] of Object.entries(typeCounts)) {
      summarySheet.addRow({
        type,
        count: data.count,
        totalValue: Math.round(data.value * 100) / 100,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      success: true,
      data: Buffer.from(buffer).toString("base64"),
      filename: `warehouse_corrections_${new Date().toISOString().split("T")[0]}.xlsx`,
    };
  } catch (error) {
    console.error("Export error:", error);
    return { error: "export failed" };
  }
}
