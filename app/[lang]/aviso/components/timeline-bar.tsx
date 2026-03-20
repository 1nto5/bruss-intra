"use client";

import { type AppointmentType, type AppointmentStatus } from "../lib/types";
import { getAppointmentStatus, getOperationLabel } from "../lib/status";
import { LedIndicator } from "@/components/ui/led-indicator";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

import type { TimelineRange } from "../lib/timeline-constants";

const STATUS_STYLES: Record<
  AppointmentStatus,
  {
    bg: string;
    border: string;
    led: "amber" | "green" | "red" | "off";
    animation: "blink" | "none" | "blink-fast";
  }
> = {
  waiting: {
    bg: "bg-amber-100 dark:bg-amber-950/60",
    border: "border-l-[3px] border-l-[var(--led-amber)]",
    led: "amber",
    animation: "blink",
  },
  delayed: {
    bg: "bg-red-100 dark:bg-red-950/60",
    border: "border-l-[3px] border-l-[var(--led-red)]",
    led: "red",
    animation: "blink-fast",
  },
  arrived: {
    bg: "bg-[oklch(0.92_0.06_145)] dark:bg-[oklch(0.22_0.04_145)]",
    border: "border-l-[3px] border-l-[var(--led-green)]",
    led: "green",
    animation: "none",
  },
  departed: {
    bg: "bg-gray-100 dark:bg-gray-800/60",
    border: "border-l-[3px] border-l-gray-300 dark:border-l-gray-600",
    led: "off",
    animation: "none",
  },
};

function OperationIcon({ appointment }: { appointment: AppointmentType }) {
  const label = getOperationLabel(appointment);
  const cls = "ml-auto h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 shrink-0 opacity-60";
  if (label === "loading+unloading") return <ArrowUpDown className={cls} />;
  if (label === "loading") return <ArrowUp className={cls} />;
  if (label === "unloading") return <ArrowDown className={cls} />;
  return null;
}

interface TimelineBarProps {
  appointment: AppointmentType;
  lane: number;
  laneCount: number;
  range: TimelineRange;
  onClick?: (appointment: AppointmentType) => void;
}

export default function TimelineBar({
  appointment,
  lane,
  laneCount,
  range,
  onClick,
}: TimelineBarProps) {
  const [sh, sm] = appointment.window_start.split(":").map(Number);
  const [eh, em] = appointment.window_end.split(":").map(Number);
  const startMin = Math.max(sh * 60 + sm, range.startMin);
  const endMin = Math.min(eh * 60 + em, range.endMin);

  if (endMin <= startMin) return null;

  const top = ((startMin - range.startMin) / range.gridTotal) * 100;
  const height = ((endMin - startMin) / range.gridTotal) * 100;
  const laneWidth = 100 / laneCount;
  const left = lane * laneWidth;
  const width = laneWidth;

  const status = getAppointmentStatus(appointment);
  const style = STATUS_STYLES[status];
  const positionStyle = {
    top: `${top}%`,
    height: `${Math.max(height, 1.5)}%`,
    left: `${left}%`,
    width: `calc(${width}% - 6px)`,
  };
  const titleText = `${appointment.plate}${appointment.company_name ? " - " + appointment.company_name : ""} | ${appointment.window_start}-${appointment.window_end}`;
  const content = (
    <span className="relative z-30 flex items-center gap-1 overflow-hidden bg-inherit">
      <LedIndicator color={style.led} size="sm" animation={style.animation} />
      <span className="flex flex-col md:flex-row md:items-center md:gap-1 flex-1 min-w-0 leading-tight">
        <span className="font-mono text-xs md:text-sm lg:text-base font-bold truncate">
          {appointment.plate}
        </span>
        {appointment.company_name && (
          <span className="text-xs md:text-sm lg:text-base truncate text-muted-foreground">
            <span className="hidden md:inline">- </span>
            {appointment.company_name}
          </span>
        )}
      </span>
      <OperationIcon appointment={appointment} />
    </span>
  );

  if (!onClick) {
    return (
      <div
        className={`absolute rounded-sm border border-[var(--panel-border)] px-1.5 py-1 text-xs overflow-hidden ${style.bg} ${style.border}`}
        style={positionStyle}
        title={titleText}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`absolute rounded-sm border border-[var(--panel-border)] px-1.5 py-1 text-xs cursor-pointer overflow-hidden transition-all duration-150 hover:shadow-md ${style.bg} ${style.border}`}
      style={positionStyle}
      onClick={() => onClick(appointment)}
      title={titleText}
    >
      {content}
    </button>
  );
}
