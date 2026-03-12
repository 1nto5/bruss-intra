"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface LiveClockProps {
  variant?: "card" | "inline";
}

export default function LiveClock({ variant = "card" }: LiveClockProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (variant === "inline") {
    return (
      <span
        className="font-mono text-sm font-bold tabular-nums tracking-wider text-muted-foreground"
        suppressHydrationWarning
      >
        {time}
      </span>
    );
  }

  return (
    <Card className="flex justify-center p-4">
      <span
        className="font-mono text-3xl font-bold tabular-nums tracking-wider text-muted-foreground"
        suppressHydrationWarning
      >
        {time}
      </span>
    </Card>
  );
}
