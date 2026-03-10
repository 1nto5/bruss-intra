"use client";

import { Badge } from "@/components/ui/badge";
import { getMatchColor, getMatchBadgeVariant } from "../../lib/calculations";

interface MatchBadgeProps {
  matchPercentage: number;
}

export function MatchBadge({ matchPercentage }: MatchBadgeProps) {
  const color = getMatchColor(matchPercentage);
  const variant = getMatchBadgeVariant(color);

  return <Badge variant={variant}>{matchPercentage}%</Badge>;
}
