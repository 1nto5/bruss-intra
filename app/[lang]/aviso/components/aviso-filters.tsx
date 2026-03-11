"use client";

import DateNavigator from "./date-navigator";
import BoardFilters from "./board-filters";
import StatusDashboard from "./status-dashboard";
import { FilterCard } from "@/components/ui/filter-card";
import { CardContent } from "@/components/ui/card";
import { FilterGrid } from "@/components/ui/filter-grid";
import { FilterField } from "@/components/ui/filter-field";
import type { AppointmentType, BoardScope, BoardOperation } from "../lib/types";
import type { Dictionary } from "../lib/dict";

interface AvisoFiltersProps {
  date: string;
  op: BoardOperation;
  onDateChange: (date: string) => void;
  onOpChange: (op: BoardOperation) => void;
  appointments: AppointmentType[];
  scope: BoardScope;
  onScopeChange: (scope: BoardScope) => void;
  dict: Dictionary;
}

export default function AvisoFilters({
  date,
  op,
  onDateChange,
  onOpChange,
  appointments,
  scope,
  onScopeChange,
  dict,
}: AvisoFiltersProps) {
  return (
    <FilterCard>
      <CardContent className="p-4">
        <FilterGrid cols={2}>
          <FilterField label={dict.filters.date}>
            <DateNavigator
              date={date}
              onDateChange={onDateChange}
              dict={dict.board}
            />
          </FilterField>
          <FilterField label={dict.filters.operation}>
            <BoardFilters op={op} onOpChange={onOpChange} dict={dict.board} />
          </FilterField>
          <FilterField label={dict.filters.status} className="sm:col-span-2">
            <StatusDashboard
              appointments={appointments}
              scope={scope}
              onScopeChange={onScopeChange}
              dict={dict}
            />
          </FilterField>
        </FilterGrid>
      </CardContent>
    </FilterCard>
  );
}
