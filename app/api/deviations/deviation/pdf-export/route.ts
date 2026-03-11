import {
  DeviationAreaType,
  DeviationReasonType,
  DeviationType,
  PrintLogType,
} from "@/app/[lang]/deviations/lib/types";
import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDate } from "@/lib/utils/date-format";
import fs from "fs";
import { jsPDF } from "jspdf";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import path from "path";
import QRCode from "qrcode";

interface GenerateDeviationPdfOptions {
  deviation: DeviationType;
  reasonOptions: DeviationReasonType[];
  areaOptions: DeviationAreaType[];
  lang: string;
  generatedBy?: string;
}

// Translation structure
const translations = {
  title: {
    pl: "Odchylenie w procesie produkcyjnym",
    en: "Deviation request in the production process",
  },
  sections: {
    details: { pl: "Szczegóły", en: "Details" },
    description: { pl: "Opis", en: "Description" },
    actions: { pl: "Działania korygujące", en: "Corrective Actions" },
    attachments: { pl: "Załączniki", en: "Attachments" },
    approvals: { pl: "Zatwierdzenia", en: "Approvals" },
  },
  fields: {
    created: { pl: "Data utworzenia", en: "Creation Date" },
    owner: { pl: "Właściciel", en: "Owner" },
    number: { pl: "Nr artykułu", en: "Article Number" },
    article: { pl: "Nazwa artykułu", en: "Article Name" },
    customerNumber: { pl: "Numer części klienta", en: "Customer Part Number" },
    customerName: { pl: "Nazwa klienta", en: "Customer Name" },
    workplace: { pl: "Stanowisko", en: "Workplace" },
    drawingNumber: { pl: "Nr rysunku", en: "Drawing Number" },
    quantity: { pl: "Ilość", en: "Quantity" },
    charge: { pl: "Partia", en: "Batch" },
    period: { pl: "Okres ważności", en: "Valid Period" },
    reason: { pl: "Powód", en: "Reason" },
    area: { pl: "Obszar", en: "Area" },
    customerAuth: { pl: "Zgoda klienta", en: "Customer Authorization" },
    specification: { pl: "Specyfikacja procesu", en: "Process Specification" },
  },
  approvals: {
    role: { pl: "Stanowisko", en: "Position" },
    by: { pl: "Osoba", en: "Person" },
    date: { pl: "Data", en: "Date" },
    reason: { pl: "Powód", en: "Reason" },
    positions: {
      "group-leader": { pl: "Group Leader", en: "Group Leader" },
      "quality-manager": { pl: "Kierownik Jakości", en: "Quality Manager" },
      "production-manager": {
        pl: "Kierownik Produkcji",
        en: "Production Manager",
      },
      "plant-manager": { pl: "Dyrektor Zakładu", en: "Plant Manager" },
    },
  },
  footer: { generated: { pl: "Wygenerowano", en: "Generated" } },
};

// Helper function for font loading (single family path)
function loadFonts(doc: jsPDF): void {
  try {
    const toBase64 = (file: string) =>
      fs
        .readFileSync(path.join(process.cwd(), "public/fonts", file))
        .toString("base64");

    doc.addFileToVFS("OpenSans-Regular.ttf", toBase64("OpenSans-Regular.ttf"));
    doc.addFileToVFS("OpenSans-Bold.ttf", toBase64("OpenSans-Bold.ttf"));
    doc.addFileToVFS("OpenSans-Italic.ttf", toBase64("OpenSans-Italic.ttf"));
    doc.addFileToVFS(
      "OpenSans-SemiBoldItalic.ttf",
      toBase64("OpenSans-SemiBoldItalic.ttf"),
    );

    doc.addFont("OpenSans-Regular.ttf", "OpenSans", "normal");
    doc.addFont("OpenSans-Bold.ttf", "OpenSans", "bold");
    doc.addFont("OpenSans-Italic.ttf", "OpenSans", "italic");
    doc.addFont("OpenSans-SemiBoldItalic.ttf", "OpenSans", "bolditalic");

    doc.setFont("OpenSans", "normal");
  } catch (error) {
    console.error("Failed to load custom fonts:", error);
    doc.setFont("helvetica", "normal");
  }
}

async function generateDeviationPdf({
  deviation,
  reasonOptions,
  areaOptions,
  lang,
  generatedBy,
}: GenerateDeviationPdfOptions): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { width, height } = doc.internal.pageSize;
  const margin = 15;

  loadFonts(doc);
  let y = margin;
  const checkForPageBreak = (neededSpace = 30): boolean => {
    if (y + neededSpace > height - 20) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header: logo, QR, title
  let logoHeight = 0;
  const qrSize = 32;
  const headerHeight = qrSize;

  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    const props = doc.getImageProperties(dataUrl);
    const logoWidth = 30;
    logoHeight = (props.height * logoWidth) / props.width;
    const logoY =
      margin + (Math.max(headerHeight, logoHeight) - logoHeight) / 2;
    doc.addImage(dataUrl, "PNG", margin, logoY, logoWidth, logoHeight);
  } catch {}

  try {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const qr = await QRCode.toDataURL(
      `${baseUrl}/deviations/${deviation._id}`,
      { width: qrSize * 4 },
    );
    const qrY = margin + (Math.max(headerHeight, logoHeight) - qrSize) / 2;
    doc.addImage(qr, "PNG", width - margin - qrSize, qrY, qrSize, qrSize);
  } catch {}

  const actualHeaderHeight = Math.max(logoHeight, qrSize);
  const titleY = margin + actualHeaderHeight / 2;
  doc.setFont("OpenSans", "bold").setFontSize(16).setTextColor(0);
  doc.text(translations.title.pl, width / 2, titleY - 4, { align: "center" });
  doc.setFont("OpenSans", "italic").setFontSize(10);
  doc.text(translations.title.en, width / 2, titleY + 2, { align: "center" });

  y = margin + actualHeaderHeight + 10;
  doc.setFont("OpenSans", "normal").setFontSize(10).setTextColor(0);

  // Deviation ID
  doc.setFont("OpenSans", "bold").setFontSize(14);
  doc.text(`ID: ${deviation.internalId || "-"}`, margin, y);
  y += 8;

  // Details section
  doc.setFont("OpenSans", "bold").setFontSize(12);
  doc.text(translations.sections.details.pl, margin, y);
  const detailsEnW = doc.getTextWidth(translations.sections.details.pl);
  doc.setFont("OpenSans", "italic");
  doc.text(` / ${translations.sections.details.en}`, margin + detailsEnW, y);
  y += 8;
  doc.setFont("OpenSans", "normal").setFontSize(10);

  const printLine = (
    key: keyof typeof translations.fields,
    value: string,
    extra = 0,
  ) => {
    const labelX = margin;
    const valueX = margin + 80;
    const maxW = width - valueX - margin;
    doc.setFont("OpenSans", "normal").setFontSize(10);
    doc.text(translations.fields[key].pl + ":", labelX, y);
    const plW = doc.getTextWidth(translations.fields[key].pl + ":");
    doc.setFont("OpenSans", "italic");
    doc.text(` / ${translations.fields[key].en}:`, labelX + plW, y);
    doc.setFont("OpenSans", "normal");
    if (value.length > 40 || key === "reason") {
      const lines = doc.splitTextToSize(value, maxW);
      lines.forEach((line: string, i: number) =>
        doc.text(line, valueX, y + i * 5),
      );
      y += 6 + extra + (lines.length - 1) * 5;
    } else {
      doc.text(value, valueX, y);
      y += 6 + extra;
    }
  };

  printLine("created", formatDate(deviation.createdAt));
  printLine("owner", extractNameFromEmail(deviation.owner));
  printLine("article", deviation.articleName || "-");
  printLine("number", deviation.articleNumber || "-");
  printLine("customerNumber", deviation.customerNumber || "-");
  printLine("customerName", deviation.customerName || "-");
  printLine("workplace", deviation.workplace || "-");
  printLine(
    "quantity",
    deviation.quantity
      ? `${deviation.quantity.value} ${deviation.quantity.unit === "pcs" ? "szt." : deviation.quantity.unit}`
      : "-",
  );
  printLine("charge", deviation.charge || "-");
  printLine(
    "period",
    deviation.timePeriod?.from && deviation.timePeriod?.to
      ? `${formatDate(deviation.timePeriod.from)} - ${formatDate(deviation.timePeriod.to)}`
      : "-",
  );
  const reasonOpt = reasonOptions.find((o) => o.value === deviation.reason);
  printLine(
    "reason",
    reasonOpt ? `${reasonOpt.pl || reasonOpt.label} / ${reasonOpt.label}` : "-",
    2,
  );
  const areaOpt = areaOptions.find((o) => o.value === deviation.area);
  printLine(
    "area",
    areaOpt
      ? areaOpt.pl && areaOpt.pl !== areaOpt.label
        ? `${areaOpt.pl} / ${areaOpt.label}`
        : areaOpt.label
      : "-",
  );
  printLine(
    "customerAuth",
    deviation.customerAuthorization ? "Tak / Yes" : "Nie / No",
  );
  printLine("specification", deviation.processSpecification || "-");

  // Description
  y += 6;
  doc.setFont("OpenSans", "bold").setFontSize(12);
  doc.text(translations.sections.description.pl, margin, y);
  const descEnW = doc.getTextWidth(translations.sections.description.pl);
  doc.setFont("OpenSans", "bolditalic");
  doc.text(` / ${translations.sections.description.en}`, margin + descEnW, y);
  y += 8;
  doc.setFont("OpenSans", "normal").setFontSize(10);
  const descLines = doc.splitTextToSize(
    deviation.description || "-",
    width - margin * 2,
  );
  descLines.forEach((l: string) => {
    doc.text(l, margin, y);
    y += 6;
  });

  // Approvals
  y += 6;
  checkForPageBreak();
  doc.setFont("OpenSans", "bold").setFontSize(12);
  doc.text(translations.sections.approvals.pl, margin, y);
  const apprEnW = doc.getTextWidth(translations.sections.approvals.pl);
  doc.setFont("OpenSans", "bolditalic");
  doc.text(` / ${translations.sections.approvals.en}`, margin + apprEnW, y);
  y += 8;
  doc.setFont("OpenSans", "normal").setFontSize(10);
  const colW = [90, 30, 30];
  let x = margin;
  (["role", "by", "date"] as (keyof typeof translations.approvals)[]).forEach(
    (f, i) => {
      const t = translations.approvals[f] as any;
      doc.setFont("OpenSans", "bold");
      doc.text(t.pl, x, y);
      const wPl = doc.getTextWidth(t.pl);
      doc.setFont("OpenSans", "bolditalic");
      doc.text(` / ${t.en}`, x + wPl, y);
      x += colW[i];
    },
  );
  y += 6;
  const approvalsList = [
    {
      approval: (deviation as any).groupLeaderApproval,
      position: "group-leader",
    },
    {
      approval: (deviation as any).qualityManagerApproval,
      position: "quality-manager",
    },
    {
      approval: (deviation as any).productionManagerApproval,
      position: "production-manager",
    },
    {
      approval: (deviation as any).plantManagerApproval,
      position: "plant-manager",
    },
  ];
  const posMap: Record<string, string> = {
    "group-leader": "Group Leader / Group Leader",
    "quality-manager": "Kierownik Jakości / Quality Manager",
    "production-manager": "Kierownik Produkcji / Production Manager",
    "plant-manager": "Dyrektor Zakładu / Plant Manager",
  };
  approvalsList.forEach(({ approval, position }) => {
    x = margin;
    doc.setFont("OpenSans", "normal");
    doc.text(posMap[position], x, y);
    x += colW[0];
    doc.text(approval?.by ? extractNameFromEmail(approval.by) : "-", x, y);
    x += colW[1];
    doc.text(approval?.at ? formatDate(approval.at) : "-", x, y);
    y += 6;
  });

  // Corrective Actions
  y += 6;
  checkForPageBreak();
  doc.setFont("OpenSans", "bold").setFontSize(12);
  doc.text(translations.sections.actions.pl, margin, y);
  const actEnW = doc.getTextWidth(translations.sections.actions.pl);
  doc.setFont("OpenSans", "bolditalic");
  doc.text(` / ${translations.sections.actions.en}`, margin + actEnW, y);
  y += 8;
  doc.setFont("OpenSans", "normal").setFontSize(10);
  if (deviation.correctiveActions?.length) {
    deviation.correctiveActions.forEach((act, idx) => {
      checkForPageBreak(15);
      const lines = doc.splitTextToSize(
        `${idx + 1}. ${act.description}`,
        width - margin * 2,
      );
      lines.forEach((l: string) => {
        if (y > height - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(l, margin, y);
        y += 6;
      });
    });
  } else {
    const noPl = "Brak działań korygujących";
    doc.setFont("OpenSans", "normal");
    doc.text(noPl, margin, y);
    const plW2 = doc.getTextWidth(noPl);
    doc.setFont("OpenSans", "italic");
    doc.text(` / No corrective actions`, margin + plW2, y);
    doc.setFont("OpenSans", "normal");
    y += 6;
  }

  // Attachments
  const attachments = deviation.attachments?.map((a) => a.name) || [];
  if (attachments.length) {
    y += 6;
    checkForPageBreak();
    doc.setFont("OpenSans", "bold").setFontSize(12);
    doc.text(translations.sections.attachments.pl, margin, y);
    const attEnW = doc.getTextWidth(translations.sections.attachments.pl);
    doc.setFont("OpenSans", "bolditalic");
    doc.text(` / ${translations.sections.attachments.en}`, margin + attEnW, y);
    y += 8;
    doc.setFont("OpenSans", "normal").setFontSize(10);
    attachments.forEach((name) => {
      checkForPageBreak();
      doc.text(`- ${name}`, margin, y);
      y += 6;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("OpenSans", "normal").setFontSize(8);
    // Page numbers higher up with x/y format
    doc.text(`${i}/${pageCount}`, width - margin, height - 15, {
      align: "right",
    });
    // Static footer text
    doc.setFont("OpenSans", "normal").setFontSize(6);

    const foot =
      "Name: CL70 PR 003 Odchylenie w procesie prod._V4 Issued/data: 2025/04/29 Release/zwolnił: A. Macełko Plant: MRG, Dept./dział: PROD Lang./język: pl/en Classification: Internal";
    doc.text(foot, margin, height - 10);
  }

  return Buffer.from(await doc.output("arraybuffer"));
}

// API route handler
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { deviationId } = await request.json();
    if (!deviationId)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const devCol = await dbc("deviations");
    const cfgCol = await dbc("deviations_configs");

    const deviation = await devCol.findOne({ _id: new ObjectId(deviationId) });
    if (!deviation)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rc = await cfgCol.findOne({ config: "reason_options" });
    const ac = await cfgCol.findOne({ config: "area_options" });

    const pdfBuffer = await generateDeviationPdf({
      deviation: deviation as DeviationType,
      reasonOptions: rc?.options || [],
      areaOptions: ac?.options || [],
      lang: "pl",
      generatedBy: extractNameFromEmail(session.user.email),
    });

    // NEW: Log printing event
    const printLog: PrintLogType = {
      printedBy: session.user.email,
      printedAt: new Date(),
    };

    // Add print log to the deviation
    await devCol.updateOne({ _id: new ObjectId(deviationId) }, {
      $push: { printLogs: printLog },
    } as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="deviation-${deviationId}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error generating PDF" },
      { status: 500 },
    );
  }
}
