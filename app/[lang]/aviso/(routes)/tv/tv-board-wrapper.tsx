"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LedIndicator } from "@/components/ui/led-indicator";
import type { AppointmentType } from "../../lib/types";
import { getAppointmentStatus } from "../../lib/status";
import TimelineBoard from "../../components/timeline-board";
import LiveClock from "../../components/live-clock";
import type { Dictionary } from "../../lib/dict";

interface TvBoardWrapperProps {
  initialAppointments: AppointmentType[];
  date: string;
  dict: Dictionary;
}

export default function TvBoardWrapper({
  initialAppointments,
  date,
  dict,
}: TvBoardWrapperProps) {
  const [appointments, setAppointments] = useState(initialAppointments);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`/api/aviso?date=${date}`);
      if (!res.ok) return;
      const data = await res.json();
      setAppointments(data);
    } catch {
      // keep current data on error
    }
  }, [date]);

  // Auto-refresh every 3s for TV mode
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 3000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const counts = useMemo(() => {
    const result = { waiting: 0, arrived: 0, delayed: 0, departed: 0 };
    for (const a of appointments) {
      result[getAppointmentStatus(a)]++;
    }
    return result;
  }, [appointments]);

  return (
    <div className="min-h-screen bg-[var(--panel-bg)] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-3xl font-bold tracking-tight">
          {date}
        </h2>

        {/* Inline status counters */}
        <div className="flex items-center gap-6">
          <StatusCount
            led="amber"
            animation="blink"
            label={dict.dashboard.scheduled}
            count={counts.waiting}
          />
          <StatusCount
            led="green"
            label={dict.dashboard.inYard}
            count={counts.arrived}
          />
          <StatusCount
            led="red"
            animation="blink-fast"
            label={dict.dashboard.delayed}
            count={counts.delayed}
          />
          <StatusCount
            led="off"
            label={dict.dashboard.departed}
            count={counts.departed}
          />
        </div>

        <LiveClock />
      </div>
      <TimelineBoard
        appointments={appointments}
        date={date}
        dict={dict}
        canEdit={false}
        canGateOp={false}
        onUpdate={fetchAppointments}
        tvMode={true}
      />
    </div>
  );
}

function StatusCount({
  led,
  animation,
  label,
  count,
}: {
  led: "amber" | "green" | "red" | "off";
  animation?: "blink" | "blink-fast";
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <LedIndicator color={led} size="lg" animation={animation ?? "none"} />
      <span className="font-mono text-2xl font-bold tabular-nums">{count}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
