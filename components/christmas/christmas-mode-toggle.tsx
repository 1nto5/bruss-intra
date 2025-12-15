'use client';

import { Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChristmas } from './christmas-context';

export function ChristmasModeToggle() {
  const { enabled, toggle, isChristmasPeriod } = useChristmas();

  // Only show toggle during Christmas period
  if (!isChristmasPeriod) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={enabled ? 'Disable Christmas mode' : 'Enable Christmas mode'}
    >
      <Snowflake
        className={`h-5 w-5 transition-colors ${enabled ? 'text-sky-400' : 'text-muted-foreground'}`}
      />
    </Button>
  );
}
