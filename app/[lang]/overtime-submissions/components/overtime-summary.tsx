'use client';

import { Badge } from '@/components/ui/badge';
import { Dictionary } from '../lib/dict';

interface OvertimeBalanceProps {
  balance: number;
  pendingHours?: number;
  dict: Dictionary;
}

export default function OvertimeBalanceDisplay({
  balance,
  pendingHours = 0,
  dict,
}: OvertimeBalanceProps) {
  const isZero = balance === 0;

  return (
    <Badge
      variant={isZero ? 'default' : 'destructive'}
      className='text-sm font-medium'
    >
      {dict.summary?.balance || 'Balance'}: {balance > 0 ? '+' : ''}{balance}h
      {pendingHours !== 0 && (
        <span className='ml-1 opacity-75'>
          ({(Math.abs(pendingHours) === 1 ? dict.summary?.includingPendingOne : dict.summary?.includingPendingMany)?.replace('{hours}', String(Math.abs(pendingHours))) || `incl. ${Math.abs(pendingHours)}h pending`})
        </span>
      )}
    </Badge>
  );
}
