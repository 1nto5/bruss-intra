'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleX, Loader, Search } from 'lucide-react';
import { useState, useEffect } from 'react';

import { revalidateCards as revalidate } from '../actions';
import { Dictionary } from '../lib/dict';
import { WarehouseConfigType } from '../lib/types';
import { SelectOption } from '@/lib/data/get-inventory-filter-options';

export default function CardsTableFilteringAndOptions({
  setFilter,
  dict,
  fetchTime,
  warehouseOptions,
  sectorConfigsMap,
}: {
  setFilter: (columnId: string, value: string) => void;
  dict: Dictionary;
  fetchTime: string;
  warehouseOptions: WarehouseConfigType[];
  sectorConfigsMap: Record<string, SelectOption[]>;
}) {
  const [filterCardNumberValue, setFilterCardNumberValue] = useState('');
  const [filterCreatorsValue, setFilterCreatorsValue] = useState('');
  const [filterWarehouseValue, setFilterWarehouseValue] = useState('');
  const [filterSectorValue, setFilterSectorValue] = useState('');
  const [isPendingSearch, setIsPendingSearch] = useState(false);

  const selectedWarehouses = filterWarehouseValue
    ? warehouseOptions.filter((w) => w.value === filterWarehouseValue)
    : [];

  const showSectorFilter =
    filterWarehouseValue &&
    selectedWarehouses.length > 0 &&
    selectedWarehouses[0].has_sectors;

  const sectorOptions = (() => {
    if (!filterWarehouseValue) return [];
    const warehouseWithSectors = selectedWarehouses.find((w) => w.has_sectors);
    return warehouseWithSectors ? sectorConfigsMap[warehouseWithSectors.value] || [] : [];
  })();

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  useEffect(() => {
    if (!showSectorFilter && filterSectorValue) {
      setFilterSectorValue('');
      setFilter('sector', '');
    }
  }, [filterWarehouseValue, showSectorFilter, filterSectorValue, setFilter]);

  const handleClearFilters = () => {
    setFilterCardNumberValue('');
    setFilterCreatorsValue('');
    setFilterWarehouseValue('');
    setFilterSectorValue('');
    setFilter('number', '');
    setFilter('creators', '');
    setFilter('warehouse', '');
    setFilter('sector', '');
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPendingSearch(true);
    setFilter('number', filterCardNumberValue);
    setFilter('creators', filterCreatorsValue);
    setFilter('warehouse', filterWarehouseValue);
    setFilter('sector', filterSectorValue);
    revalidate();
  };

  const hasActiveFilters = Boolean(
    filterCardNumberValue ||
      filterCreatorsValue ||
      filterWarehouseValue ||
      filterSectorValue,
  );

  const canSearch = hasActiveFilters;

  return (
    <Card>
      <CardContent className='p-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.cardNumber}</Label>
              <Input
                type='number'
                value={filterCardNumberValue}
                onChange={(e) => setFilterCardNumberValue(e.target.value)}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.creators}</Label>
              <Input
                value={filterCreatorsValue}
                onChange={(e) => setFilterCreatorsValue(e.target.value)}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.warehouse}</Label>
              <Select value={filterWarehouseValue} onValueChange={setFilterWarehouseValue}>
                <SelectTrigger>
                  <SelectValue placeholder={dict.filters.notSelected} />
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showSectorFilter && (
              <div className='flex flex-col space-y-1'>
                <Label>{dict.filters.sector}</Label>
                <Select value={filterSectorValue} onValueChange={setFilterSectorValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={dict.filters.notSelected} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className='flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-4'>
            <Button
              type='button'
              variant='destructive'
              onClick={handleClearFilters}
              disabled={isPendingSearch || !hasActiveFilters}
              className='order-2 w-full sm:order-1'
            >
              <CircleX /> {dict.filters.clearFilters}
            </Button>
            <Button
              type='submit'
              variant='secondary'
              disabled={isPendingSearch || !canSearch}
              className='order-1 w-full sm:order-2'
            >
              {isPendingSearch ? (
                <Loader className='animate-spin' />
              ) : (
                <Search />
              )}
              {dict.filters.search}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
