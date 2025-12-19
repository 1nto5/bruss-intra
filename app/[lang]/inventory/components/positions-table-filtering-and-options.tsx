'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClearableCombobox } from '@/components/clearable-combobox';
import { CircleX, Loader, Search } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { revalidatePositions as revalidate } from '../actions';
import { Dictionary } from '../lib/dict';
import { SelectOption } from '@/lib/data/get-inventory-filter-options';
import { WarehouseConfigType } from '../lib/types';

export default function PositionsTableFilteringAndOptions({
  setFilter,
  dict,
  fetchTime,
  warehouseOptions,
  sectorConfigsMap,
  binOptions,
}: {
  setFilter: (columnId: string, value: string) => void;
  dict: Dictionary;
  fetchTime: string;
  warehouseOptions: WarehouseConfigType[];
  sectorConfigsMap: Record<string, SelectOption[]>;
  binOptions: SelectOption[];
}) {
  const [filterPositionValue, setFilterPositionValue] = useState('');
  const [filterArticleNameValue, setFilterArticleNameValue] = useState('');
  const [filterArticleNumberValue, setFilterArticleNumberValue] = useState('');
  const [filterQuantityValue, setFilterQuantityValue] = useState('');
  const [filterWarehouseValue, setFilterWarehouseValue] = useState('');
  const [filterSectorValue, setFilterSectorValue] = useState('');
  const [filterBinValue, setFilterBinValue] = useState('');
  const [isPendingSearch, setIsPendingSearch] = useState(false);

  const selectedWarehouses = filterWarehouseValue
    ? warehouseOptions.filter((w) => w.value === filterWarehouseValue)
    : [];

  const showSectorFilter =
    filterWarehouseValue &&
    selectedWarehouses.length > 0 &&
    selectedWarehouses[0].has_sectors;

  const showBinFilter =
    filterWarehouseValue &&
    selectedWarehouses.length > 0 &&
    selectedWarehouses[0].has_bins;

  const sectorOptions = (() => {
    if (!filterWarehouseValue) return [];
    const warehouseWithSectors = selectedWarehouses.find((w) => w.has_sectors);
    return warehouseWithSectors ? sectorConfigsMap[warehouseWithSectors.value] || [] : [];
  })();

  const filteredBinOptions = useMemo(() => {
    if (!filterWarehouseValue) return [];

    const selectedWarehouse = warehouseOptions.find(
      (w) => w.value === filterWarehouseValue
    );

    if (!selectedWarehouse?.bin_warehouse_id) return [];

    return binOptions.filter(
      (bin) => bin.warehouse_id === selectedWarehouse.bin_warehouse_id
    );
  }, [filterWarehouseValue, warehouseOptions, binOptions]);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  useEffect(() => {
    if (!showSectorFilter && filterSectorValue) {
      setFilterSectorValue('');
      setFilter('sector', '');
    }
    if (!showBinFilter && filterBinValue) {
      setFilterBinValue('');
      setFilter('bin', '');
    }
  }, [filterWarehouseValue, showSectorFilter, showBinFilter, filterSectorValue, filterBinValue, setFilter]);

  const handleClearFilters = () => {
    setFilterPositionValue('');
    setFilterArticleNameValue('');
    setFilterArticleNumberValue('');
    setFilterQuantityValue('');
    setFilterWarehouseValue('');
    setFilterSectorValue('');
    setFilterBinValue('');
    setFilter('identifier', '');
    setFilter('articleName', '');
    setFilter('articleNumber', '');
    setFilter('quantity', '');
    setFilter('warehouse', '');
    setFilter('sector', '');
    setFilter('bin', '');
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPendingSearch(true);
    setFilter('identifier', filterPositionValue);
    setFilter('articleName', filterArticleNameValue);
    setFilter('articleNumber', filterArticleNumberValue);
    setFilter('quantity', filterQuantityValue);
    setFilter('warehouse', filterWarehouseValue);
    setFilter('sector', filterSectorValue);
    setFilter('bin', filterBinValue);
    revalidate();
  };

  const hasActiveFilters = Boolean(
    filterPositionValue ||
      filterArticleNameValue ||
      filterArticleNumberValue ||
      filterQuantityValue ||
      filterWarehouseValue ||
      filterSectorValue ||
      filterBinValue,
  );

  const canSearch = hasActiveFilters;

  return (
    <Card>
      <CardContent className='p-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
            {showBinFilter && (
              <div className='flex flex-col space-y-1'>
                <Label>{dict.filters.bin}</Label>
                <ClearableCombobox
                  value={filterBinValue}
                  onValueChange={setFilterBinValue}
                  placeholder={dict.filters.notSelected}
                  searchPlaceholder={dict.filters.searchPlaceholder}
                  notFoundText={dict.filters.notFound}
                  clearLabel={dict.filters.clear}
                  options={filteredBinOptions}
                  className='w-full'
                />
              </div>
            )}
            <div className='flex flex-col space-y-1'>
              <Label>ID</Label>
              <Input
                value={filterPositionValue}
                onChange={(e) => setFilterPositionValue(e.target.value)}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.positions.articleName}</Label>
              <Input
                value={filterArticleNameValue}
                onChange={(e) => setFilterArticleNameValue(e.target.value)}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.positions.articleNumber}</Label>
              <Input
                value={filterArticleNumberValue}
                onChange={(e) => setFilterArticleNumberValue(e.target.value)}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.positions.quantity}</Label>
              <Input
                value={filterQuantityValue}
                onChange={(e) => setFilterQuantityValue(e.target.value)}
              />
            </div>
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
