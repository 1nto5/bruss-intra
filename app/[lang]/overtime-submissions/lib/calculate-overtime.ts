'use server';

import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';

export interface OvertimeSummary {
  currentMonthHours: number;
  totalHours: number;
  monthLabel: string;
}

/**
 * Calculate unclaimed overtime hours for a user using the balances API.
 * Uses status filter to exclude 'accounted' and 'cancelled' entries.
 */
export async function calculateUnclaimedOvertimeHours(
  userEmail: string,
  selectedMonth?: string,
): Promise<OvertimeSummary> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build month label and filter
    let monthLabel = '';
    let monthParam = '';

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      monthLabel = `${month.toString().padStart(2, '0')}.${year}`;
      monthParam = selectedMonth;
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      monthParam = `${year}-${month.toString().padStart(2, '0')}`;
    }

    // Fetch balance for this user with month filter
    // Status filter: exclude 'accounted' and 'cancelled' (only include pending, approved)
    const params = new URLSearchParams({
      employee: userEmail,
      month: monthParam,
      status: 'pending,approved',
      userRoles: 'admin', // bypass permission check for server action
    });

    const response = await fetch(`${baseUrl}/api/overtime-submissions/balances?${params}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const balances: EmployeeBalanceType[] = await response.json();
    const userBalance = balances.find((b) => b.email === userEmail);

    if (!userBalance) {
      return {
        currentMonthHours: 0,
        totalHours: 0,
        monthLabel,
      };
    }

    return {
      currentMonthHours: userBalance.periodHours,
      totalHours: userBalance.allTimeBalance,
      monthLabel,
    };
  } catch (error) {
    console.error('Error calculating overtime hours:', error);
    return {
      currentMonthHours: 0,
      totalHours: 0,
      monthLabel: '',
    };
  }
}

