"use client";

import { ColumnDef } from "@tanstack/react-table";

import { ProjectsLocaleStringType } from "../../../lib/types";

export const columns: ColumnDef<ProjectsLocaleStringType>[] = [
  {
    accessorKey: "dateLocaleString",
    header: "Date",
  },
  {
    accessorKey: "time",
    header: "Time [h]",
  },
  {
    accessorKey: "scope",
    header: "Work Scope",
    cell: ({ row }) => {
      const scope = row.getValue("scope");
      return <div className="w-[400px] text-justify">{scope as string}</div>;
    },
  },
  {
    accessorKey: "note",
    header: "Note",
    cell: ({ row }) => {
      const note = row.getValue("note");
      return <div className="w-[250px] text-justify">{note as string}</div>;
    },
  },
];
