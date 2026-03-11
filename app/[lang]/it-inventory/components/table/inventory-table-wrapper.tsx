"use client";

import { Session } from "next-auth";
import { Dictionary } from "../../lib/dict";
import { ITInventoryItem } from "../../lib/types";
import { DataTable } from "./data-table";
import { createColumns } from "./columns";

export default function InventoryTableWrapper({
  items,
  session,
  dict,
  lang,
}: {
  items: ITInventoryItem[];
  session: Session | null;
  dict: Dictionary;
  lang: string;
}) {
  return (
    <DataTable
      columns={createColumns}
      data={items}
      session={session}
      dict={dict}
      lang={lang}
    />
  );
}
