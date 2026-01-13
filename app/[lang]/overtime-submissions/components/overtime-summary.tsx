'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { Calendar, Clock } from 'lucide-react';
import { OvertimeSummary } from '../lib/calculate-overtime';
import { Dictionary } from '../lib/dict';

interface OvertimeSummaryProps {
  overtimeSummary: OvertimeSummary;
  dict: Dictionary;
  selectedEmployeeEmail?: string | null;
  hasActiveFilters?: boolean;
  showBothCards?: boolean;
  isOrganizationView?: boolean;
  onlyMySubmissions?: boolean;
  onlyOrders?: boolean;
  hasOtherFilters?: boolean;
}

export default function OvertimeSummaryDisplay({
  overtimeSummary,
  dict,
  selectedEmployeeEmail,
  hasActiveFilters = false,
  showBothCards = true,
  isOrganizationView = false,
  onlyMySubmissions = false,
  onlyOrders = false,
  hasOtherFilters = false,
}: OvertimeSummaryProps) {
  // Get employee name if an employee is selected
  const employeeName = selectedEmployeeEmail
    ? extractNameFromEmail(selectedEmployeeEmail)
    : null;

  // Determine appropriate labels based on context
  const getMonthLabel = () => {
    if (onlyOrders && hasOtherFilters) {
      // Orders + other filters active
      return dict.summary.ordersFilteredOvertimeIn;
    } else if (onlyOrders && !hasOtherFilters) {
      // Only orders active, no other filters
      return `${dict.summary.ordersOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    } else if (isOrganizationView) {
      // HR/Admin viewing all organization data without filters
      return `${dict.summary.organizationOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    } else if (employeeName) {
      // Single employee selected
      return `${dict.summary.employeeOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    } else if (onlyMySubmissions && hasOtherFilters) {
      // "Tylko moje" (Only mine) + other filters active
      return dict.summary.yourFilteredOvertimeIn;
    } else if (onlyMySubmissions && !hasOtherFilters) {
      // Only "Tylko moje" active, no other filters
      return `${dict.summary.yourOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    } else if (hasActiveFilters) {
      // Other filters active (without onlyMySubmissions)
      return dict.summary.filteredOvertimeIn || 'Overtime in filtered range';
    } else {
      // No filters - current user's data
      return `${dict.summary.yourOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    }
  };

  const getTotalLabel = () => {
    if (onlyOrders) {
      // Orders active (with or without other filters)
      return dict.summary.ordersTotalOvertime;
    } else if (isOrganizationView) {
      // HR/Admin viewing all organization data without filters
      return dict.summary.organizationTotalOvertime;
    } else if (employeeName) {
      // Single employee selected - use same label as month card
      return `${dict.summary.employeeOvertimeIn} ${overtimeSummary.monthLabel || dict.summary.currentMonth}`;
    } else if (onlyMySubmissions) {
      // "Tylko moje" active (with or without other filters)
      return dict.summary.yourTotalOvertime;
    } else if (hasActiveFilters) {
      // Other filters active (without onlyMySubmissions)
      return (
        dict.summary.filteredTotalOvertime || 'Total overtime in filtered range'
      );
    } else {
      // No filters - current user's data
      return dict.summary.yourTotalOvertime;
    }
  };
  // If only one card should be shown, display the total summary
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
