"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { LedIndicator } from "@/components/ui/led-indicator";

interface StatusStripProps extends React.HTMLAttributes<HTMLDivElement> {
  /** API connection status */
  apiStatus?: "online" | "offline" | "connecting";
  /** Database connection status */
  dbStatus?: "online" | "offline" | "connecting";
  /** Current shift identifier */
  shift?: string;
  /** Show live clock */
  showClock?: boolean;
}

function StatusStrip({
  className,
  apiStatus = "online",
  dbStatus = "online",
  shift,
  showClock = true,
  ...props
}: StatusStripProps) {
  const [time, setTime] = React.useState<string>("");

  React.useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: "online" | "offline" | "connecting") => {
    switch (status) {
      case "online":
        return "green" as const;
      case "offline":
        return "red" as const;
      case "connecting":
        return "amber" as const;
    }
  };

  const getStatusAnimation = (status: "online" | "offline" | "connecting") => {
    switch (status) {
      case "online":
        return "none" as const;
      case "offline":
        return "none" as const;
      case "connecting":
        return "pulse" as const;
    }
  };

  return (
    <div
      className={cn(
        // Industrial status strip: dark, compact, fixed at top
        "flex h-7 items-center justify-between px-4",
        "bg-[oklch(0.18_0.02_260)] text-[oklch(0.75_0.02_260)]",
        "border-b border-[oklch(0.25_0.02_260)]",
        "text-[10px] font-medium uppercase tracking-wider",
        className,
      )}
      {...props}
    >
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        <LedIndicator
          color={getStatusColor(apiStatus)}
          animation={getStatusAnimation(apiStatus)}
          label="API"
          size="sm"
        />
        <LedIndicator
          color={getStatusColor(dbStatus)}
          animation={getStatusAnimation(dbStatus)}
          label="DB"
          size="sm"
        />
        {shift && (
          <>
            <span className="text-[oklch(0.4_0.02_260)]">|</span>
            <span>
              Shift:{" "}
              <span className="text-[oklch(0.85_0.02_260)]">{shift}</span>
            </span>
          </>
        )}
      </div>

      {/* Right: Clock */}
      {showClock && (
        <div className="font-mono tabular-nums text-[oklch(0.85_0.02_260)]">
          {time}
        </div>
      )}
    </div>
  );
}

export { StatusStrip };
