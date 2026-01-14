'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { OvertimeSummary } from '../lib/calculate-overtime';
import { Dictionary } from '../lib/dict';

interface OvertimeSummaryProps {
  overtimeSummary: OvertimeSummary;
  dict: Dictionary;
  showBothCards?: boolean;
  onlyOrders?: boolean;
}

export default function OvertimeSummaryDisplay({
  overtimeSummary,
  dict,
  showBothCards = true,
  onlyOrders = false,
}: OvertimeSummaryProps) {
  // Get labels for personal view (always showing logged-in user's data)
  const getMonthLabel = () => {
    if (onlyOrders) {
      return `${dict.summary.ordersOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    }
    return `${dict.summary.yourOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
  };

  const getTotalLabel = () => {
    if (onlyOrders) {
      return dict.summary.ordersTotalOvertime;
    }
    return dict.summary.yourTotalOvertime;
  };

  // If only one card should be shown (time filters active), display the total summary
  if (!showBothCards) {
    return (
      <div className='mb-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2 text-sm font-medium'>
              <Calendar className='h-4 w-4' />
              {getTotalLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (overtimeSummary.totalHours || 0) < 0
                  ? 'animate-pulse text-red-600 dark:text-red-400'
                  : ''
              }`}
            >
              {overtimeSummary.totalHours ?? 0}h
              {(overtimeSummary.pendingTotalHours || 0) !== 0 && (
                <span className='text-base font-normal'>
                  {' '}
                  ({overtimeSummary.pendingTotalHours ?? 0}h{' '}
                  {dict.summary.pending})
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show both cards (month + total)
  return (
    <div className='flex flex-col gap-2 sm:grid sm:grid-cols-2'>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <Clock className='h-4 w-4' />
            {getMonthLabel()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              (overtimeSummary.currentMonthHours || 0) < 0
                ? 'animate-pulse text-red-600 dark:text-red-400'
                : ''
            }`}
          >
            {overtimeSummary.currentMonthHours ?? 0}h
            {(overtimeSummary.pendingMonthHours || 0) !== 0 && (
              <span className='text-base font-normal'>
                {' '}
                ({overtimeSummary.pendingMonthHours ?? 0}h{' '}
                {dict.summary.pending})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <Calendar className='h-4 w-4' />
            {getTotalLabel()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              (overtimeSummary.totalHours || 0) < 0 ||
              (overtimeSummary.totalHours || 0) >
                (overtimeSummary.currentMonthHours || 0)
                ? 'animate-pulse text-red-600 dark:text-red-400'
                : ''
            }`}
          >
            {overtimeSummary.totalHours ?? 0}h
            {(overtimeSummary.pendingTotalHours || 0) !== 0 && (
              <span className='text-base font-normal'>
                {' '}
                ({overtimeSummary.pendingTotalHours ?? 0}h{' '}
                {dict.summary.pending})
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
