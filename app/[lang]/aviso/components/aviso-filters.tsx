"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DateNavigator from "./date-navigator";
import LiveClock from "./live-clock";
import BoardFilters from "./board-filters";
import type { BoardScope, BoardOperation } from "../lib/types";

interface AvisoFiltersProps {
  date: string;
  scope: BoardScope;
  op: BoardOperation;
  onDateChange: (date: string) => void;
  onScopeChange: (scope: BoardScope) => void;
  onOpChange: (op: BoardOperation) => void;
  dict: {
    today: string;
    tomorrow: string;
    prevDay: string;
    nextDay: string;
    scope: { all: string; yard: string; delayed: string };
    op: { all: string; loading: string; unloading: string };
  };
}

export default function AvisoFilters({
  date,
  scope,
  op,
  onDateChange,
  onScopeChange,
  onOpChange,
  dict,
}: AvisoFiltersProps) {
  return (
    <Card>
      <CardHeader className="p-4">
        <BoardFilters
          scope={scope}
          op={op}
          onScopeChange={onScopeChange}
          onOpChange={onOpChange}
          dict={dict}
        />
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DateNavigator date={date} onDateChange={onDateChange} dict={dict} />
          <LiveClock />
        </div>
      </CardContent>
    </Card>
  );
}
