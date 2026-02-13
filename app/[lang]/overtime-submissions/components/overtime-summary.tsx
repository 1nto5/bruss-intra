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
          ({pendingHours > 0 ? '+' : ''}{pendingHours}h {dict.summary?.pending || 'pending'})
        </span>
      )}
    </Badge>
  );
}
