"use client";

import { Button } from "@/components/ui/button";
import { LedIndicator } from "@/components/ui/led-indicator";
import { ArrowUp, ArrowDown } from "lucide-react";
import { type BoardScope, type BoardOperation } from "../lib/types";

interface BoardFiltersProps {
  scope: BoardScope;
  op: BoardOperation;
  onScopeChange: (scope: BoardScope) => void;
  onOpChange: (op: BoardOperation) => void;
  dict: {
    scope: { all: string; yard: string; delayed: string };
    op: { all: string; loading: string; unloading: string };
  };
}

export default function BoardFilters({
  scope,
  op,
  onScopeChange,
  onOpChange,
  dict,
}: BoardFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
      <div className="grid grid-cols-3 gap-1 sm:flex">
        <Button
          variant={scope === "all" ? "default" : "outline"}
          size="sm"
          className="press-feedback text-xs uppercase tracking-wide"
          onClick={() => onScopeChange("all")}
        >
          {dict.scope.all}
        </Button>
        <Button
          variant={scope === "yard" ? "default" : "outline"}
          size="sm"
          className={`press-feedback text-xs uppercase tracking-wide ${scope === "yard" ? "bg-[oklch(0.45_0.15_145)] hover:bg-[oklch(0.42_0.15_145)]" : ""}`}
          onClick={() => onScopeChange("yard")}
        >
          <LedIndicator color={scope === "yard" ? "green" : "off"} size="sm" />
          {dict.scope.yard}
        </Button>
        <Button
          variant={scope === "delayed" ? "default" : "outline"}
          size="sm"
          className={`press-feedback text-xs uppercase tracking-wide ${scope === "delayed" ? "bg-[oklch(0.45_0.18_25)] hover:bg-[oklch(0.42_0.18_25)]" : ""}`}
          onClick={() => onScopeChange("delayed")}
        >
          <LedIndicator
            color={scope === "delayed" ? "red" : "off"}
            size="sm"
            animation={scope === "delayed" ? "blink-fast" : "none"}
          />
          {dict.scope.delayed}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1 sm:flex">
        <Button
          variant={op === "all" ? "default" : "outline"}
          size="sm"
          className="press-feedback text-xs uppercase tracking-wide"
          onClick={() => onOpChange("all")}
        >
          {dict.op.all}
        </Button>
        <Button
          variant={op === "loading" ? "default" : "outline"}
          size="sm"
          className="press-feedback text-xs uppercase tracking-wide"
          onClick={() => onOpChange("loading")}
        >
          <ArrowUp />
          {dict.op.loading}
        </Button>
        <Button
          variant={op === "unloading" ? "default" : "outline"}
          size="sm"
          className="press-feedback text-xs uppercase tracking-wide"
          onClick={() => onOpChange("unloading")}
        >
          <ArrowDown />
          {dict.op.unloading}
        </Button>
      </div>
    </div>
  );
}
