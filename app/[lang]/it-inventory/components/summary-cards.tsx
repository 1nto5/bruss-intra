"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Laptop,
  Monitor,
  Smartphone,
  Printer,
  Package,
  UserCheck,
  UserX,
} from "lucide-react";
import { Dictionary } from "../lib/dict";
import { ITInventoryItem } from "../lib/types";

export default function SummaryCards({
  items,
  dict,
}: {
  items: ITInventoryItem[];
  dict: Dictionary;
}) {
  const totalItems = items.length;
  const assignedItems = items.filter((item) => item.currentAssignment).length;
  const unassignedItems = totalItems - assignedItems;

  // Count by category
  const notebooks = items.filter((item) => item.category === "notebook").length;
  const workstations = items.filter(
    (item) => item.category === "workstation",
  ).length;
  const monitors = items.filter((item) => item.category === "monitor").length;
  const iphones = items.filter((item) => item.category === "iphone").length;
  const androids = items.filter((item) => item.category === "android").length;
  const printers = items.filter((item) => item.category === "printer").length;
  const labelPrinters = items.filter(
    (item) => item.category === "label-printer",
  ).length;
  const scanners = items.filter(
    (item) => item.category === "portable-scanner",
  ).length;

  const smartphones = iphones + androids;
  const allPrinters = printers + labelPrinters + scanners;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.summary.totalItems}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {dict.summary.allEquipment}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.summary.assigned}
          </CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{assignedItems}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {((assignedItems / totalItems) * 100 || 0).toFixed(0)}%{" "}
            {dict.summary.inUse}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.summary.unassigned}
          </CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unassignedItems}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {dict.summary.available}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.summary.byCategory}
          </CardTitle>
          <Laptop className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {dict.categories.notebook}/{dict.categories.workstation}:
              </span>
              <span className="font-medium">{notebooks + workstations}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {dict.categories.monitor}:
              </span>
              <span className="font-medium">{monitors}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {dict.summary.phones}:
              </span>
              <span className="font-medium">{smartphones}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {dict.summary.printers}:
              </span>
              <span className="font-medium">{allPrinters}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
