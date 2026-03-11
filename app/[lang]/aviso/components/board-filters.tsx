"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { type BoardOperation } from "../lib/types";

interface BoardFiltersProps {
  op: BoardOperation;
  onOpChange: (op: BoardOperation) => void;
  dict: {
    op: { all: string; loading: string; unloading: string };
  };
}

export default function BoardFilters({
  op,
  onOpChange,
  dict,
}: BoardFiltersProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
      <Button
        variant={op === "all" ? "default" : "outline"}
        size="sm"
        className="press-feedback text-xs uppercase tracking-wide"
        onClick={() => onOpChange("all")}
      >
        <ArrowUpDown />
        <span className="hidden sm:inline">{dict.op.all}</span>
      </Button>
      <Button
        variant={op === "loading" ? "default" : "outline"}
        size="sm"
        className="press-feedback text-xs uppercase tracking-wide"
        onClick={() => onOpChange("loading")}
      >
        <ArrowUp />
        <span className="hidden sm:inline">{dict.op.loading}</span>
      </Button>
      <Button
        variant={op === "unloading" ? "default" : "outline"}
        size="sm"
        className="press-feedback text-xs uppercase tracking-wide"
        onClick={() => onOpChange("unloading")}
      >
        <ArrowDown />
        <span className="hidden sm:inline">{dict.op.unloading}</span>
      </Button>
    </div>
  );
}
