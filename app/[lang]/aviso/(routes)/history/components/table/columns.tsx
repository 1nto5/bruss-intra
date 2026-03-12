"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/utils/date-format";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import LocalizedLink from "@/components/localized-link";
import type { AppointmentType } from "../../../../lib/types";
import type { Dictionary } from "../../../../lib/dict";

function getOpLabel(a: AppointmentType, dict: Dictionary): string {
  if (a.op_loading && a.op_unloading) return dict.loadingUnloading;
  if (a.op_loading) return dict.loading;
  if (a.op_unloading) return dict.unloading;
  return dict.unknown;
}

export const createColumns = (
  dict: Dictionary,
  searchParams: string,
): ColumnDef<AppointmentType>[] => [
  {
    accessorKey: "date",
    header: dict.details.date,
    cell: ({ row }) => formatDate(row.getValue("date") as string),
  },
  {
    accessorKey: "plate",
    header: dict.details.plate,
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("plate") as string}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <LocalizedLink
        href={`/aviso/${row.original._id}${searchParams ? `?${searchParams}` : ""}`}
      >
        <Button variant="ghost" size="icon">
          <ExternalLink />
        </Button>
      </LocalizedLink>
    ),
  },
  {
    id: "window",
    header: dict.details.window,
    cell: ({ row }) =>
      `${row.original.window_start} - ${row.original.window_end}`,
  },
  {
    id: "operation",
    header: dict.details.operation,
    cell: ({ row }) => getOpLabel(row.original, dict),
  },
  {
    accessorKey: "driver_name",
    header: dict.details.driverName,
    cell: ({ row }) => (row.getValue("driver_name") as string) || "-",
  },
  {
    accessorKey: "company_name",
    header: dict.details.companyName,
    cell: ({ row }) => (row.getValue("company_name") as string) || "-",
  },
  {
    accessorKey: "gate_entry_time",
    header: dict.details.gateEntry,
    cell: ({ row }) => (row.getValue("gate_entry_time") as string) || "-",
  },
  {
    accessorKey: "gate_exit_time",
    header: dict.details.gateExit,
    cell: ({ row }) => (row.getValue("gate_exit_time") as string) || "-",
  },
];
