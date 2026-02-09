'use client';

import { ClearableCombobox } from '@/components/clearable-combobox';
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
import { SelectOption } from '@/lib/data/get-inventory-filter-options';
import { useEffect, useMemo, useState } from 'react';
import { revalidatePositions as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
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
    return warehouseWithSectors
      ? sectorConfigsMap[warehouseWithSectors.value] || []
      : [];
  })();

  const filteredBinOptions = useMemo(() => {
    if (!filterWarehouseValue) return [];

    const selectedWarehouse = warehouseOptions.find(
      (w) => w.value === filterWarehouseValue,
    );

    if (!selectedWarehouse?.bin_warehouse_id) return [];

    return binOptions.filter(
      (bin) => bin.warehouse_id === selectedWarehouse.bin_warehouse_id,
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
  }, [
    filterWarehouseValue,
    showSectorFilter,
    showBinFilter,
    filterSectorValue,
    filterBinValue,
    setFilter,
  ]);

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

  return (
    <FilterCard>
      <FilterCardContent className='pt-4' onSubmit={handleSearchClick}>
        <FilterGrid cols={3}>
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
          {showBinFilter && (
            <FilterField label={dict.filters.bin}>
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
            </FilterField>
          )}
          <FilterField label='ID'>
            <Input
              value={filterPositionValue}
              onChange={(e) => setFilterPositionValue(e.target.value)}
            />
          </FilterField>
          <FilterField label={dict.positions.articleName}>
            <Input
              value={filterArticleNameValue}
              onChange={(e) => setFilterArticleNameValue(e.target.value)}
            />
          </FilterField>
          <FilterField label={dict.positions.articleNumber}>
            <Input
              value={filterArticleNumberValue}
              onChange={(e) => setFilterArticleNumberValue(e.target.value)}
            />
          </FilterField>
          <FilterField label={dict.positions.quantity}>
            <Input
              value={filterQuantityValue}
              onChange={(e) => setFilterQuantityValue(e.target.value)}
            />
          </FilterField>
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
