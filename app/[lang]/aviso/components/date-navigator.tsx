"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { shiftDate, formatDateYmd, parseYmdOrToday } from "../lib/time-utils";

interface DateNavigatorProps {
  date: string;
  onDateChange: (date: string) => void;
  dict: {
    today: string;
    tomorrow: string;
    prevDay: string;
    nextDay: string;
  };
}

export default function DateNavigator({
  date,
  onDateChange,
  dict,
}: DateNavigatorProps) {
  const today = formatDateYmd();
  const tomorrow = shiftDate(today, 1);
  const dateObj = parseYmdOrToday(date);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full items-center rounded-sm border border-[var(--panel-border)] bg-card overflow-hidden sm:w-auto">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-none border-r border-[var(--panel-border)] press-feedback"
          onClick={() => onDateChange(shiftDate(date, -1))}
          title={dict.prevDay}
        >
          <ChevronLeft />
        </Button>

        <DateTimePicker
          value={dateObj}
          onChange={(d) => {
            if (d) onDateChange(formatDateYmd(d));
          }}
          hideTime
          renderTrigger={({ value, setOpen, open }) => (
            <DateTimeInput
              value={value}
              onChange={(d) => {
                if (d) onDateChange(formatDateYmd(d));
              }}
              format="dd/MM/yyyy"
              className="mb-0 h-full rounded-none border-0 shadow-none ring-offset-0"
              onCalendarClick={() => setOpen(!open)}
            />
          )}
        />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-none border-l border-[var(--panel-border)] press-feedback"
          onClick={() => onDateChange(shiftDate(date, 1))}
          title={dict.nextDay}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button
          variant={date === today ? "default" : "outline"}
          size="sm"
          className="press-feedback text-xs uppercase tracking-wide"
          onClick={() => onDateChange(today)}
        >
          {dict.today}
        </Button>
        <Button
          variant={date === tomorrow ? "default" : "outline"}
          size="sm"
          className="press-feedback text-xs uppercase tracking-wide"
          onClick={() => onDateChange(tomorrow)}
        >
          {dict.tomorrow}
        </Button>
      </div>
    </div>
  );
}
