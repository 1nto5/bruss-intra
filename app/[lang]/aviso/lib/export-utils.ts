import ExcelJS from "exceljs";
import { type AppointmentType } from "./types";
import {
  getAppointmentStatus,
  computeDelayMinutes,
  computeYardMinutes,
} from "./status";

const REPORT_HEADERS = [
  "Data",
  "Rejestracja",
  "OknoOd",
  "OknoDo",
  "TypOperacji",
  "Kierowca",
  "Firma",
  "Przewoznik",
  "TelefonKierowcy",
  "TelefonFirmy",
  "NrArtykulu",
  "Ilosc",
  "TO",
  "Wjazd",
  "Wyjazd",
  "Status",
  "OpoznienieMin",
  "CzasNaPlacuMin",
  "Komentarz",
];

function getOperationLabelPl(a: any): string {
  const loading = Boolean(a.op_loading);
  const unloading = Boolean(a.op_unloading);
  if (loading && unloading) return "załadunek + rozładunek";
  if (loading) return "załadunek";
  if (unloading) return "rozładunek";
  return "nieokreślone";
}

function statusLabelPl(status: string): string {
  const map: Record<string, string> = {
    departed: "wyjechał",
    arrived: "na placu",
    delayed: "spóźnione",
    waiting: "planowane",
  };
  return map[status] || status;
}

function buildReportRow(a: any, now: Date = new Date()) {
  const status = getAppointmentStatus(a as AppointmentType, now);
  const delay = computeDelayMinutes(a as AppointmentType, now);
  const yard = computeYardMinutes(a as AppointmentType, now);

  return {
    Data: a.date,
    Rejestracja: a.plate,
    OknoOd: a.window_start,
    OknoDo: a.window_end,
    TypOperacji: getOperationLabelPl(a),
    Kierowca: a.driver_name || "",
    Firma: a.company_name || "",
    Przewoznik: a.carrier_name || "",
    TelefonKierowcy: a.driver_phone || "",
    TelefonFirmy: a.company_phone || "",
    NrArtykulu: (a.items || []).map((i: any) => i.article_number).filter(Boolean).join(", "),
    Ilosc: (a.items || []).map((i: any) => i.quantity).filter(Boolean).join(", "),
    TO: (a.items || []).map((i: any) => i.transfer_order).filter(Boolean).join(", "),
    Wjazd: a.gate_entry_time || "",
    Wyjazd: a.gate_exit_time || "",
    Status: statusLabelPl(status),
    OpoznienieMin: delay === null ? "" : delay,
    CzasNaPlacuMin: yard === null ? "" : yard,
    Komentarz: a.comment || "",
  };
}

function escapeCsvValue(value: any): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (/[";,\n\r]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

export function generateCsvString(appointments: any[]): string {
  const now = new Date();
  const rows = appointments.map((a) => buildReportRow(a, now));
  const lines = [REPORT_HEADERS.join(";")];
  rows.forEach((row: any) => {
    lines.push(REPORT_HEADERS.map((key) => escapeCsvValue(row[key])).join(";"));
  });
  return lines.join("\n");
}

export async function generateExcelBuffer(
  appointments: any[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Raport");
  const now = new Date();

  worksheet.addRow(REPORT_HEADERS);

  appointments.forEach((a) => {
    const row = buildReportRow(a, now);
    worksheet.addRow(REPORT_HEADERS.map((key) => (row as any)[key]));
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
