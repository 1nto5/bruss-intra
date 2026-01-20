'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export default function OeeTimeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current mode from URL or default to 'range'
  const currentMode = searchParams?.get('mode') || 'range';

  // State for each mode
  const [dayDate, setDayDate] = useState<Date | undefined>(() => {
    const dateParam = searchParams?.get('date');
    return dateParam ? new Date(dateParam) : new Date();
  });

  const [weekYear, setWeekYear] = useState(() => {
    return parseInt(searchParams?.get('year') || new Date().getFullYear().toString());
  });

  const [weekNumber, setWeekNumber] = useState(() => {
    return parseInt(searchParams?.get('week') || '1');
  });

  const [monthYear, setMonthYear] = useState(() => {
    return parseInt(searchParams?.get('year') || new Date().getFullYear().toString());
  });

  const [monthNumber, setMonthNumber] = useState(() => {
    return parseInt(searchParams?.get('month') || (new Date().getMonth() + 1).toString());
  });

  const [rangeDate, setRangeDate] = useState<DateRange | undefined>(() => {
    const fromParam = searchParams?.get('from');
    const toParam = searchParams?.get('to');

    if (fromParam && toParam) {
      return {
        from: new Date(fromParam),
        to: new Date(toParam),
      };
    }

    // Default: last 30 days
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const [isOpen, setIsOpen] = useState(false);

  const applySelection = (mode: string) => {
    const params = new URLSearchParams();
    params.set('mode', mode);

    switch (mode) {
      case 'day':
        if (dayDate) {
          params.set('date', dayDate.toISOString().split('T')[0]);
        }
        break;
      case 'week':
        params.set('year', weekYear.toString());
        params.set('week', weekNumber.toString());
        break;
      case 'month':
        params.set('year', monthYear.toString());
        params.set('month', monthNumber.toString());
        break;
      case 'range':
        if (rangeDate?.from) {
          params.set('from', rangeDate.from.toISOString().split('T')[0]);
        }
        if (rangeDate?.to) {
          params.set('to', rangeDate.to.toISOString().split('T')[0]);
        }
        break;
    }

    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  // Format display label based on current mode
  const getDisplayLabel = () => {
    switch (currentMode) {
      case 'day':
        const date = searchParams?.get('date');
        return date ? new Date(date).toLocaleDateString() : 'Select day';
      case 'week':
        const year = searchParams?.get('year');
        const week = searchParams?.get('week');
        return year && week ? `Week ${week}, ${year}` : 'Select week';
      case 'month':
        const mYear = searchParams?.get('year');
        const month = searchParams?.get('month');
        if (mYear && month) {
          return new Date(parseInt(mYear), parseInt(month) - 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });
        }
        return 'Select month';
      case 'range':
        const from = searchParams?.get('from');
        const to = searchParams?.get('to');
        if (from && to) {
          return `${new Date(from).toLocaleDateString()} - ${new Date(to).toLocaleDateString()}`;
        }
        return 'Select range';
      default:
        return 'Select period';
    }
  };

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate week options (1-53)
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <CalendarIcon />
          {getDisplayLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Tabs defaultValue={currentMode} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="range">Range</TabsTrigger>
          </TabsList>

          {/* Day Mode */}
          <TabsContent value="day" className="space-y-4 p-4">
            <Calendar
              mode="single"
              selected={dayDate}
              onSelect={setDayDate}
              initialFocus
            />
            <Button
              onClick={() => applySelection('day')}
              className="w-full"
              disabled={!dayDate}
            >
              Apply
            </Button>
          </TabsContent>

          {/* Week Mode */}
          <TabsContent value="week" className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select
                value={weekYear.toString()}
                onValueChange={(v) => setWeekYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Week</label>
              <Select
                value={weekNumber.toString()}
                onValueChange={(v) => setWeekNumber(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {weeks.map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => applySelection('week')} className="w-full">
              Apply
            </Button>
          </TabsContent>

          {/* Month Mode */}
          <TabsContent value="month" className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select
                value={monthYear.toString()}
                onValueChange={(v) => setMonthYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select
                value={monthNumber.toString()}
                onValueChange={(v) => setMonthNumber(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => applySelection('month')} className="w-full">
              Apply
            </Button>
          </TabsContent>

          {/* Range Mode */}
          <TabsContent value="range" className="space-y-4 p-4">
            <Calendar
              mode="range"
              selected={rangeDate}
              onSelect={setRangeDate}
              numberOfMonths={2}
              initialFocus
            />
            <Button
              onClick={() => applySelection('range')}
              className="w-full"
              disabled={!rangeDate?.from || !rangeDate?.to}
            >
              Apply
            </Button>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
