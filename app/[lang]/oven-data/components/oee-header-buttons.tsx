"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader, RefreshCw, BarChart3 } from "lucide-react";
import LocalizedLink from "@/components/localized-link";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dictionary } from "../lib/dict";

interface OeeHeaderButtonsProps {
  lang: string;
  dict: Dictionary;
}

export default function OeeHeaderButtons({
  lang,
  dict,
}: OeeHeaderButtonsProps) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const handleRefresh = async () => {
    if (isPending) return;

    setIsPending(true);

    // Invalidate all OEE queries to trigger refetch
    await queryClient.invalidateQueries({ queryKey: ["oee"] });

    // Reset pending state after a short delay
    setTimeout(() => {
      setIsPending(false);
    }, 500);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <LocalizedLink href="/oven-data">
        <Button variant="outline" className="w-full sm:w-auto">
          <ArrowLeft />
          <span>{dict.oeeButtons.backToOvenData}</span>
        </Button>
      </LocalizedLink>
      <LocalizedLink href="/oven-data/failures">
        <Button variant="outline" className="w-full sm:w-auto">
          <BarChart3 />
          <span>{dict.oeeButtons.failureStatistics}</span>
        </Button>
      </LocalizedLink>
      <Button
        onClick={handleRefresh}
        disabled={isPending}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {isPending ? <Loader className="animate-spin" /> : <RefreshCw />}
        <span>{dict.oeeButtons.refresh}</span>
      </Button>
    </div>
  );
}
