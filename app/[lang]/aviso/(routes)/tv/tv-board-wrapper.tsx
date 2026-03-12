"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LedIndicator } from "@/components/ui/led-indicator";
import type { AppointmentType } from "../../lib/types";
import { getAppointmentStatus } from "../../lib/status";
import { formatDateYmd } from "../../lib/time-utils";
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
  date: initialDate,
  dict,
}: TvBoardWrapperProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [date, setDate] = useState(initialDate);

  const fetchAppointments = useCallback(async (fetchDate: string) => {
    try {
      const res = await fetch(`/api/aviso?date=${fetchDate}`);
      if (!res.ok) return;
      const data = await res.json();
      setAppointments(data);
    } catch {
      // keep current data on error
    }
  }, []);

  // Auto-refresh every 3s for TV mode
  useEffect(() => {
    const interval = setInterval(() => fetchAppointments(date), 3000);
    return () => clearInterval(interval);
  }, [date, fetchAppointments]);

  // Auto-advance date at midnight (TV always shows today)
  const todayRef = useRef(formatDateYmd());
  useEffect(() => {
    const interval = setInterval(() => {
      const now = formatDateYmd();
      if (now !== todayRef.current) {
        setDate(now);
        todayRef.current = now;
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

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
        onUpdate={() => fetchAppointments(date)}
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
