"use client";

import { Button } from "@/components/ui/button";
import { Loader, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface RefreshButtonProps {
  fetchTime: Date;
  onRefresh: () => Promise<void>;
  label?: string;
}

export function RefreshButton({
  fetchTime,
  onRefresh,
  label = "Refresh",
}: RefreshButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(fetchTime);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // When fetchTime changes, it means data was refreshed
    if (fetchTime.getTime() !== lastFetchTime.getTime()) {
      setIsPending(false);
      setLastFetchTime(fetchTime);
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [fetchTime, lastFetchTime]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    if (isPending) return; // Prevent multiple clicks

    setIsPending(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a timeout to reset pending state after 5 seconds
    // in case the fetchTime doesn't update
    timeoutRef.current = setTimeout(() => {
      setIsPending(false);
    }, 5000);

    await onRefresh();
  };

  return (
    <Button onClick={handleRefresh} disabled={isPending} variant="outline">
      {isPending ? <Loader className="animate-spin" /> : <RefreshCw />}
      <span>{label}</span>
    </Button>
  );
}
