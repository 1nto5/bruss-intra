"use client";

import { useState, useEffect } from "react";
import type { TimelineRange } from "../lib/timeline-constants";
import type { AppointmentType } from "../lib/types";

type ArrangedItem = AppointmentType & { start: number; end: number; lane: number };

interface NowLineProps {
  date: string;
  items: ArrangedItem[];
  laneCount: number;
  range: TimelineRange;
}

function buildGradient(laneCount: number, activeLanes: Set<number>): string {
  const high = "color-mix(in oklch, var(--destructive) 80%, transparent)";
  const low = "color-mix(in oklch, var(--destructive) 50%, transparent)";
  const stops: string[] = [];
  for (let i = 0; i < laneCount; i++) {
    const color = activeLanes.has(i) ? low : high;
    const start = (i / laneCount) * 100;
    const end = ((i + 1) / laneCount) * 100;
    stops.push(`${color} ${start}%`, `${color} ${end}%`);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export default function NowLine({ date, items, laneCount, range }: NowLineProps) {
  const [position, setPosition] = useState<number | null>(null);
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (date !== today) {
        setPosition(null);
        return;
      }
      const nowMin =
        now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (nowMin < range.startMin || nowMin > range.endMin) {
        setPosition(null);
        return;
      }
      setPosition(((nowMin - range.startMin) / range.gridTotal) * 100);
      const lanes = new Set<number>();
      items.forEach((item) => {
        if (nowMin >= item.start && nowMin <= item.end) {
          lanes.add(item.lane);
        }
      });
      setActiveLanes(lanes);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [date, items, range]);

  if (position === null) return null;

  return (
    <div
      className="pointer-events-none absolute left-[72px] right-[10px] z-20 h-[4px]"
      style={{ top: `${position}%`, background: buildGradient(laneCount, activeLanes) }}
    />
  );
}
