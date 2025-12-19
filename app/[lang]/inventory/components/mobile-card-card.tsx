'use client';

import { CardTableDataType, WarehouseConfigType } from '../lib/types';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import LocalizedLink from '@/components/localized-link';
import { Dictionary } from '../lib/dict';

interface MobileCardCardProps {
  card: CardTableDataType;
  dict: Dictionary;
  warehouseOptions?: WarehouseConfigType[];
}

export function MobileCardCard({
  card,
  dict,
  warehouseOptions,
}: MobileCardCardProps) {
  const shouldHighlight =
    card.positionsLength <= 3
      ? card.approvedPositions === 0
      : card.approvedPositions < 3;

  const warehouseConfig = warehouseOptions?.find((w) => w.value === card.warehouse);
  const warehouseLabel = warehouseConfig?.label || card.warehouse;
  const showSector = warehouseConfig?.has_sectors ?? true;

  return (
    <LocalizedLink href={`/inventory/${card.number}`}>
      <div
        className={cn(
          'relative rounded-md border p-4',
          'active:scale-[0.98] transition-transform',
          'touch-manipulation cursor-pointer bg-card'
        )}
      >
        <div className='flex items-center justify-between mb-3'>
          <span className='font-mono text-lg font-semibold'>{card.number}</span>
          <ChevronRight className='h-4 w-4 text-muted-foreground' />
        </div>

        <div className='flex gap-4 mb-2'>
          {showSector && (
            <div className='flex-1'>
              <span className='text-xs uppercase tracking-wide text-muted-foreground'>
                {dict.cards.sector}
              </span>
              <p className='font-medium'>{card.sector}</p>
            </div>
          )}
          <div className='flex-1'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>
              {dict.cards.warehouse}
            </span>
            <p className='font-medium'>{warehouseLabel}</p>
          </div>
        </div>

        <div className='flex gap-4 mb-2'>
          <div className='flex-1'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>
              {dict.cards.positionsCount}
            </span>
            <p className='font-mono'>{card.positionsLength}</p>
          </div>
          <div className='flex-1'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>
              {dict.cards.approvedCount}
            </span>
            <p
              className={cn(
                'font-mono',
                shouldHighlight && 'text-red-500 font-bold animate-pulse'
              )}
            >
              {card.approvedPositions}
            </p>
          </div>
        </div>

        <div>
          <span className='text-xs uppercase tracking-wide text-muted-foreground'>
            {dict.cards.creators}
          </span>
          <p className='text-sm text-muted-foreground truncate'>
            {card.creators.join(', ')}
          </p>
        </div>
      </div>
    </LocalizedLink>
  );
}
