'use client';

import { FilterActions } from '@/components/ui/filter-actions';
import { FilterCard, FilterCardContent } from '@/components/ui/filter-card';
import { FilterField } from '@/components/ui/filter-field';
import { FilterGrid } from '@/components/ui/filter-grid';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';

import { SelectOption } from '@/lib/data/get-inventory-filter-options';
import { revalidateCards as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { WarehouseConfigType } from '../lib/types';

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
    return warehouseWithSectors
      ? sectorConfigsMap[warehouseWithSectors.value] || []
      : [];
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

  return (
    <FilterCard>
      <FilterCardContent className='pt-4' onSubmit={handleSearchClick}>
        <FilterGrid cols={4}>
          <FilterField label={dict.filters.cardNumber}>
            <Input
              type='number'
              value={filterCardNumberValue}
              onChange={(e) => setFilterCardNumberValue(e.target.value)}
            />
          </FilterField>
          <FilterField label={dict.filters.creators}>
            <Input
              value={filterCreatorsValue}
              onChange={(e) => setFilterCreatorsValue(e.target.value)}
            />
          </FilterField>
          <FilterField label={dict.filters.warehouse}>
            <Select
              value={filterWarehouseValue}
              onValueChange={setFilterWarehouseValue}
            >
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
          </FilterField>
          {showSectorFilter && (
            <FilterField label={dict.filters.sector}>
              <Select
                value={filterSectorValue}
                onValueChange={setFilterSectorValue}
              >
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
            </FilterField>
          )}
        </FilterGrid>

        <FilterActions
          onClear={handleClearFilters}
          isPending={isPendingSearch}
          disabled={!hasActiveFilters}
          clearLabel={dict.filters.clearFilters}
          searchLabel={dict.filters.search}
        />
      </FilterCardContent>
    </FilterCard>
  );
}
