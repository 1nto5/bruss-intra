"use client";

import { useState, useEffect, useMemo } from "react";
import { Truck } from "lucide-react";
import type { AppointmentType } from "../lib/types";
import TimelineBar from "./timeline-bar";
import NowLine from "./now-line";
import AppointmentDialog from "./appointment-dialog";
import { computeTimelineRange } from "../lib/timeline-constants";
import { formatDateYmd } from "../lib/time-utils";
import type { Dictionary } from "../lib/dict";

interface TimelineBoardProps {
  appointments: AppointmentType[];
  date: string;
  dict: Dictionary;
  canEdit: boolean;
  canGateOp: boolean;
  onUpdate: () => void;
  tvMode?: boolean;
}

function arrangeLanes(appointments: AppointmentType[]) {
  const items = appointments
    .map((a) => {
      const [sh, sm] = a.window_start.split(":").map(Number);
      const [eh, em] = a.window_end.split(":").map(Number);
      return { ...a, start: sh * 60 + sm, end: eh * 60 + em };
    })
    .filter((a) => !isNaN(a.start) && !isNaN(a.end) && a.end > a.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const laneEnds: number[] = [];
  const lanes: number[] = [];

  items.forEach((item) => {
    let laneIndex = laneEnds.findIndex((end) => end <= item.start);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[laneIndex] = item.end;
    }
    lanes.push(laneIndex);
  });

  return {
    items: items.map((item, i) => ({ ...item, lane: lanes[i] })),
    laneCount: Math.max(laneEnds.length, 1),
  };
}

export default function TimelineBoard({
  appointments,
  date,
  dict,
  canEdit,
  canGateOp,
  onUpdate,
  tvMode = false,
}: TimelineBoardProps) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sync selectedAppointment with updated appointments prop
  useEffect(() => {
    if (selectedAppointment && dialogOpen) {
      const updated = appointments.find(
        (a) => a._id === selectedAppointment._id,
      );
      if (updated) {
        setSelectedAppointment(updated);
      } else {
        setSelectedAppointment(null);
        setDialogOpen(false);
      }
    }
  }, [appointments]);

  const range = useMemo(() => {
    const now = new Date();
    const today = formatDateYmd(now);
    return computeTimelineRange(
      appointments,
      date === today ? now.getHours() : undefined,
    );
  }, [appointments, date]);

  const { items, laneCount } = arrangeLanes(appointments);

  const handleBarClick = (appointment: AppointmentType) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Timeline grid */}
      <div
        className={`relative rounded-sm border border-[var(--panel-border)] bg-[var(--panel-bg)] ${tvMode ? "h-[100vh]" : "h-[700px] sm:h-[800px]"}`}
      >
        {/* Panel texture overlay */}
        <div className="panel-texture pointer-events-none absolute inset-0 z-0 opacity-40" />

        {/* Hour lines */}
        {range.hours.map((hour, i) => (
          <div
            key={hour}
            className="absolute left-0 right-0 flex items-start border-t border-[var(--panel-border)]"
            style={{ top: `${(i / range.hourCount) * 100}%` }}
          >
            <span className="flex w-[68px] items-center justify-end bg-[var(--panel-inset)] border-r border-b border-[var(--panel-border)] rounded-br-sm pr-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-muted-foreground uppercase tracking-wide">
              {String(hour).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {/* Now line */}
        <NowLine date={date} items={items} laneCount={laneCount} range={range} />

        {/* Appointment bars */}
        <div className="absolute inset-0 left-[72px] right-[10px] z-10">
          {items.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-sm border-2 border-dashed border-[var(--panel-border)] p-6">
                <Truck className="h-10 w-10 opacity-30" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest">
                {dict.board.empty}
              </span>
            </div>
          )}
          {items.map((item) => (
            <TimelineBar
              key={item._id}
              appointment={item}
              lane={item.lane}
              laneCount={laneCount}
              range={range}
              onClick={tvMode ? undefined : handleBarClick}
            />
          ))}
        </div>
      </div>

      {/* Appointment dialog */}
      {!tvMode && (
        <AppointmentDialog
          appointment={selectedAppointment}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          canEdit={canEdit}
          canGateOp={canGateOp}
          dict={dict}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
