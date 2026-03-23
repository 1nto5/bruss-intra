"use server";

import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import ExcelJS from "exceljs";
import { revalidateTag } from "next/cache";

export async function importArticles(
  formData: FormData,
): Promise<
  | { success: string; inserted: number; updated: number; total: number }
  | { error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { error: "unauthorized" };
    }

    if (!session.user.roles?.includes("admin")) {
      return { error: "unauthorized" };
    }

    const file = formData.get("file") as File | null;
    if (!file || !file.name.endsWith(".xlsx")) {
      return { error: "invalidFileType" };
    }

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer as never);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { error: "noValidRows" };
    }

    // Find columns dynamically by header name
    const headerRow = sheet.getRow(1);
    const columnMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = String(cell.value ?? "").trim();
      if (value === "Material") columnMap.material = colNumber;
      if (value === "Material Description")
        columnMap.materialDescription = colNumber;
      if (value === "Price") columnMap.price = colNumber;
      if (value === "Price unit") columnMap.priceUnit = colNumber;
    });

    if (!columnMap.material || !columnMap.materialDescription) {
      return { error: "noValidRows" };
    }

    const operations: {
      updateOne: {
        filter: { articleNumber: string };
        update: {
          $set: Record<string, unknown>;
          $setOnInsert: Record<string, unknown>;
        };
        upsert: boolean;
      };
    }[] = [];

    const now = new Date();
    const userEmail = session.user.email;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const articleNumber = String(
        row.getCell(columnMap.material).value ?? "",
      ).trim();
      const articleName = String(
        row.getCell(columnMap.materialDescription).value ?? "",
      ).trim();

      if (!articleNumber || !articleName) return;

      // Parse price: remove thousand separators (commas), then parseFloat
      const rawPriceValue = row.getCell(columnMap.price ?? 0).value;
      const rawPrice = parseFloat(
        String(rawPriceValue ?? "0").replace(/,/g, ""),
      );

      const priceUnitValue = row.getCell(columnMap.priceUnit ?? 0).value;
      const priceUnit = parseFloat(String(priceUnitValue ?? "1")) || 1;

      const unitPrice =
        Math.round((rawPrice / priceUnit) * 1_000_000) / 1_000_000;

      operations.push({
        updateOne: {
          filter: { articleNumber },
          update: {
            $set: {
              articleName,
              unitPrice,
              active: true,
              updatedAt: now,
              updatedBy: userEmail,
            },
            $setOnInsert: {
              createdAt: now,
              createdBy: userEmail,
            },
          },
          upsert: true,
        },
      });
    });

    if (operations.length === 0) {
      return { error: "noValidRows" };
    }

    const collection = await dbc("wh_corrections_articles");
    const result = await collection.bulkWrite(operations);

    revalidateTag("warehouse-corrections-articles", { expire: 0 });

    const inserted = result.upsertedCount;
    const updated = result.modifiedCount;

    return {
      success: "articlesImported",
      inserted,
      updated,
      total: operations.length,
    };
  } catch (error) {
    console.error("Import articles error:", error);
    return { error: "importFailed" };
  }
}
