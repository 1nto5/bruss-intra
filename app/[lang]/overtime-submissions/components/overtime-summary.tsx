'use client';

import { Badge } from '@/components/ui/badge';
import { Dictionary } from '../lib/dict';

interface OvertimeBalanceProps {
  balance: number;
  dict: Dictionary;
}

export default function OvertimeBalanceDisplay({
  balance,
  dict,
}: OvertimeBalanceProps) {
  const isZero = balance === 0;

  return (
    <Badge
      variant={isZero ? 'default' : 'destructive'}
      className='text-sm font-medium'
    >
      {dict.summary?.balance || 'Balance'}: {balance > 0 ? '+' : ''}{balance}h
    </Badge>
  );
}
