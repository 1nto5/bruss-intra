'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // Import Card components
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CircleX, Loader, Search } from 'lucide-react'; // Remove RefreshCw
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
// Import useRef for initial mount check if needed, but direct navigation is simpler here
import { useEffect, useState } from 'react';
import { Dictionary } from '../lib/dict';
import { DeviationAreaType, DeviationReasonType } from '../lib/types';

export default function TableFilteringAndOptions({
  fetchTime, // Keep fetchTime prop for useEffect dependency
  isLogged,
  userEmail,
  areaOptions, // Add areaOptions prop
  reasonOptions, // Add reasonOptions prop
  dict,
}: {
  fetchTime: Date;
  isLogged: boolean;
  userEmail?: string;
  areaOptions: DeviationAreaType[]; // Define type for areaOptions
  reasonOptions: DeviationReasonType[]; // Define type for reasonOptions
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [showFilters, setShowFilters] = useState(() => {
    return !!(
      searchParams?.get('date') ||
      searchParams?.get('createdAt') ||
      searchParams?.get('status') ||
      searchParams?.get('area') || // Check for area param
      searchParams?.get('reason') // Check for reason param
    );
  });

  const [showOnlyMine, setShowOnlyMine] = useState(() => {
    const owner = searchParams?.get('owner');
    return owner === userEmail;
  });

  const [dateFilter, setDateFilter] = useState(() => {
    const dateParam = searchParams?.get('date');
    return dateParam ? new Date(dateParam) : undefined;
  });
  const [createdAtFilter, setRequestedAtFilter] = useState(() => {
    const createdAtParam = searchParams?.get('createdAt');
    return createdAtParam ? new Date(createdAtParam) : undefined;
  });
  const [statusFilter, setStatusFilter] = useState(
    searchParams?.get('status') || ''
  );
  // Add state for area and reason filters
  const [areaFilter, setAreaFilter] = useState(searchParams?.get('area') || '');
  const [reasonFilter, setReasonFilter] = useState(
    searchParams?.get('reason') || ''
  );

  // Function to build search params based on current state
  const buildSearchParams = (currentState: {
    date?: Date;
    createdAt?: Date;
    status: string;
    area: string;
    reason: string;
    owner?: string | null; // Use current showOnlyMine state
  }) => {
    const params = new URLSearchParams(); // Start fresh
    if (currentState.date) params.set('date', currentState.date.toISOString());
    if (currentState.createdAt)
      params.set('createdAt', currentState.createdAt.toISOString());
    if (currentState.status) params.set('status', currentState.status);
    if (currentState.area) params.set('area', currentState.area);
    if (currentState.reason) params.set('reason', currentState.reason);
    if (showOnlyMine && userEmail) params.set('owner', userEmail); // Use component state for owner
    return params;
  };

  // Handler for Select changes (triggers search immediately)
  const handleSelectChange = (
    filterType: 'status' | 'area' | 'reason',
    value: string
  ) => {
    // Update local state first
    if (filterType === 'status')
      setStatusFilter(value); // Use value directly
    else if (filterType === 'area')
      setAreaFilter(value); // Use value directly
    else if (filterType === 'reason') setReasonFilter(value); // Use value directly

    // Build new params based on the change
    const params = buildSearchParams({
      date: dateFilter,
      createdAt: createdAtFilter,
      status: filterType === 'status' ? value : statusFilter, // Use value directly
      area: filterType === 'area' ? value : areaFilter, // Use value directly
      reason: filterType === 'reason' ? value : reasonFilter, // Use value directly
    });

    const newUrl = `${pathname}?${params.toString()}`;

    // Only push if URL changes
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    }
  };

  const handleClearFilters = () => {
    setDateFilter(undefined);
    setRequestedAtFilter(undefined);
    setStatusFilter('');
    setAreaFilter('');
    setReasonFilter('');
    setShowOnlyMine(false); // Also clear the 'only mine' toggle

    // Only push if there were existing params
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || ''); // Navigate to base path to clear params
    }
  };

  // Handler for the main "Search" button (primarily for date changes)
  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildSearchParams({
      date: dateFilter,
      createdAt: createdAtFilter,
      status: statusFilter,
      area: areaFilter,
      reason: reasonFilter,
    });

    const newUrl = `${pathname}?${params.toString()}`;

    // Only push or revalidate if the URL or parameters actually change
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    }
    // No revalidate needed here as push handles it
  };

  // Handler for "Show Only Mine" toggle (triggers search immediately)
  const handleShowOnlyMineChange = (checked: boolean) => {
    setShowOnlyMine(checked);
    // Build params reflecting the new 'owner' state
    const params = buildSearchParams({
      date: dateFilter,
      createdAt: createdAtFilter,
      status: statusFilter,
      area: areaFilter,
      reason: reasonFilter,
      // Temporarily override owner based on 'checked' for param building
      owner: checked ? userEmail : null,
    });

    // Update the owner param specifically based on 'checked'
    if (checked && userEmail) {
      params.set('owner', userEmail);
    } else {
      params.delete('owner');
    }

    const newUrl = `${pathname}?${params.toString()}`;
    setIsPendingSearch(true); // Start pending state immediately
    router.push(newUrl); // Trigger navigation
  };

  return (
    <Card>
      {' '}
      {/* Wrap filters in a Card */}
      <CardHeader className="p-4">
        {' '}
        {/* Adjust padding */}
        <form onSubmit={handleSearchClick} className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-filters"
              checked={showFilters}
              onCheckedChange={setShowFilters}
            />
            <Label htmlFor="show-filters">{dict.filters.showFilters}</Label>
            {isLogged && (
              <>
                <Switch
                  id="only-my-requests"
                  checked={showOnlyMine}
                  onCheckedChange={handleShowOnlyMineChange}
                />
                <Label htmlFor="only-my-requests">{dict.filters.onlyMy}</Label>
              </>
            )}
          </div>
        </form>
      </CardHeader>
      {showFilters && (
        <CardContent className="p-4 pt-4">
          {' '}
          {/* Adjust padding */}
          <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
            {' '}
            {/* Increase gap */}
            {/* Row 1: Status, Area, Reason */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Status Filter */}
              <div className="flex flex-col space-y-1">
                <Label>{dict.filters.status}</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('status', value)}
                  value={statusFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.filters.select} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in approval">
                      {dict.table.status.inApproval}
                    </SelectItem>
                    <SelectItem value="in progress">
                      {dict.table.status.inProgress}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {dict.table.status.rejected}
                    </SelectItem>
                    <SelectItem value="draft">
                      {dict.table.status.draft}
                    </SelectItem>
                    <SelectItem value="closed">
                      {dict.table.status.closed}
                    </SelectItem>
                    <SelectItem value="approved">
                      {dict.table.status.approved}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {dict.table.status.cancelled}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Area Filter */}
              <div className="flex flex-col space-y-1">
                <Label>{dict.filters.area}</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('area', value)}
                  value={areaFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.filters.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.pl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Reason Filter */}
              <div className="flex flex-col space-y-1">
                <Label>{dict.filters.reason}</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('reason', value)}
                  value={reasonFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.filters.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.pl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Row 2: Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Date Filter */}
              <div className="flex flex-col space-y-1">
                <Label>{dict.filters.deviationDate}</Label>
                <DateTimePicker
                  value={dateFilter}
                  onChange={setDateFilter}
                  hideTime
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(x) => !open && setDateFilter(x)}
                      format="dd/MM/yyyy"
                      disabled={open}
                      onCalendarClick={() => setOpen(!open)}
                      className="w-full"
                    />
                  )}
                />
              </div>
              {/* CreatedAt Filter */}
              <div className="flex flex-col space-y-1">
                <Label>{dict.filters.createdDate}</Label>
                <DateTimePicker
                  value={createdAtFilter}
                  onChange={setRequestedAtFilter}
                  hideTime
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(x) => !open && setRequestedAtFilter(x)}
                      format="dd/MM/yyyy"
                      disabled={open}
                      onCalendarClick={() => setOpen(!open)}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>
            {/* Row 3: Action buttons */}
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleClearFilters}
                title={dict.filters.clear}
                disabled={isPendingSearch}
                className="order-2 w-full sm:order-1"
              >
                <CircleX /> <span>{dict.filters.clear}</span>
              </Button>

              <Button
                type="submit"
                variant="secondary"
                disabled={isPendingSearch}
                className="order-1 w-full sm:order-2"
              >
                {isPendingSearch ? (
                  <>
                    <Loader className="animate-spin" />{' '}
                    <span>{dict.filters.search}</span>
                  </>
                ) : (
                  <>
                    <Search /> <span>{dict.filters.search}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
