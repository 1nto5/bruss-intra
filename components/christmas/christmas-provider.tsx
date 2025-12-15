'use client';

import { useChristmas } from './christmas-context';
import { ChristmasWrapper } from './christmas-wrapper';

export function ChristmasProvider() {
  const { enabled } = useChristmas();

  if (!enabled) {
    return null;
  }

  return <ChristmasWrapper />;
}
