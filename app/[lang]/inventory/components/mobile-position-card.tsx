'use client';

import { PositionType, WarehouseConfigType } from '../lib/types';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import LocalizedLink from '@/components/localized-link';
import { Dictionary } from '../lib/dict';

interface MobilePositionCardProps {
  position: PositionType;
  dict: Dictionary;
  warehouseOptions?: WarehouseConfigType[];
}

export function MobilePositionCard({
  position,
  dict,
  warehouseOptions,
}: MobilePositionCardProps) {
  const [cardNumber, positionNum] = position.identifier.split('/');
  const isApproved = Boolean(position.approver);

  const warehouseLabel =
    warehouseOptions?.find((w) => w.value === position.warehouse)?.label ||
    position.warehouse;

  return (
    <LocalizedLink href={`/inventory/${cardNumber}/${positionNum}/edit`}>
      <div
        className={cn(
          'relative rounded-md border p-4',
          'active:scale-[0.98] transition-transform',
          'touch-manipulation cursor-pointer',
          isApproved ? 'bg-green-50 dark:bg-green-950/30' : 'bg-card'
        )}
      >
        <div className='flex items-center justify-between mb-3'>
          <div className='flex flex-col'>
            <span className='font-mono text-base font-bold'>
              {position.identifier}
            </span>
            {position.bin && (
              <div className='mt-0.5'>
                <span className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                  BIN
                </span>
                <span className='font-mono text-xs text-muted-foreground ml-1'>
                  {position.bin.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {isApproved && (
              <Check className='h-4 w-4 text-green-600 dark:text-green-400' />
            )}
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
          </div>
        </div>

        <div className='mb-2'>
          <span className='text-xs uppercase tracking-wide text-muted-foreground'>
            {dict.positions.articleName}
          </span>
          <p className='font-medium line-clamp-2'>{position.articleName}</p>
        </div>

        <div className='flex gap-4'>
          <div className='flex-1'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>
              {dict.positions.articleNumber}
            </span>
            <p className='font-mono text-sm'>{position.articleNumber}</p>
          </div>
          <div>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>
              {dict.positions.quantity}
            </span>
            <p className='font-mono text-sm'>
              {position.quantity} {position.unit}
            </p>
          </div>
        </div>

        {position.warehouse && (
          <div className='mt-2 pt-2 border-t'>
            <div className='flex-1'>
              <span className='text-xs uppercase tracking-wide text-muted-foreground'>
                {dict.positions.warehouse}
              </span>
              <p className='text-sm'>{warehouseLabel}</p>
            </div>
          </div>
        )}
      </div>
    </LocalizedLink>
  );
}
