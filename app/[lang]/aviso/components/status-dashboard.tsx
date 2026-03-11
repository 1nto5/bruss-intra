"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LedIndicator } from "@/components/ui/led-indicator";
import type { AppointmentType, BoardScope } from "../lib/types";
import { getAppointmentStatus } from "../lib/status";
import type { Dictionary } from "../lib/dict";

interface StatusDashboardProps {
  appointments: AppointmentType[];
  scope: BoardScope;
  onScopeChange: (scope: BoardScope) => void;
  dict: Dictionary;
}

const SCOPE_MAP: Record<string, BoardScope> = {
  total: "all",
  waiting: "waiting",
  arrived: "yard",
  delayed: "delayed",
  departed: "departed",
};

export default function StatusDashboard({
  appointments,
  scope,
  onScopeChange,
  dict,
}: StatusDashboardProps) {
  const counts = useMemo(() => {
    const result = {
      total: 0,
      waiting: 0,
      arrived: 0,
      delayed: 0,
      departed: 0,
    };
    for (const a of appointments) {
      result.total++;
      result[getAppointmentStatus(a)]++;
    }
    return result;
  }, [appointments]);

  const cells: {
    key: keyof typeof counts;
    label: string;
    color: "amber" | "green" | "red" | "off" | undefined;
    animation: "blink" | "none" | "blink-fast" | undefined;
  }[] = [
    {
      key: "total",
      label: dict.dashboard.total,
      color: undefined,
      animation: undefined,
    },
    {
      key: "waiting",
      label: dict.dashboard.scheduled,
      color: "amber",
      animation: "blink",
    },
    {
      key: "arrived",
      label: dict.dashboard.inYard,
      color: "green",
      animation: "none",
    },
    {
      key: "delayed",
      label: dict.dashboard.delayed,
      color: "red",
      animation: "blink-fast",
    },
    {
      key: "departed",
      label: dict.dashboard.departed,
      color: "off",
      animation: "none",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {cells.map(({ key, label, color, animation }) => {
        const cardScope = SCOPE_MAP[key];
        const isActive = scope === cardScope && scope !== "all";

        return (
          <Button
            key={key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="press-feedback text-xs uppercase tracking-wide"
            onClick={() => onScopeChange(isActive ? "all" : cardScope)}
          >
            {color && (
              <LedIndicator color={color} size="sm" animation={animation} />
            )}
            {label}
            <span className="font-mono font-bold tabular-nums">
              {counts[key]}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
