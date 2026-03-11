"use client";

import { useState, useEffect } from "react";
import { START_MIN, END_MIN, GRID_TOTAL } from "../lib/timeline-constants";

interface NowLineProps {
  date: string;
}

export default function NowLine({ date }: NowLineProps) {
  const [position, setPosition] = useState<number | null>(null);

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
      if (nowMin < START_MIN || nowMin > END_MIN) {
        setPosition(null);
        return;
      }
      setPosition(((nowMin - START_MIN) / GRID_TOTAL) * 100);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [date]);

  if (position === null) return null;

  return (
    <div
      className="pointer-events-none absolute left-[72px] right-[10px] z-20 border-t-2 border-destructive/50"
      style={{ top: `${position}%` }}
    />
  );
}
