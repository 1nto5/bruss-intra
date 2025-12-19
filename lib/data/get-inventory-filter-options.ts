'use server';

import { dbc } from '@/lib/db/mongo';
import { WarehouseConfigType } from '@/app/[lang]/inventory/lib/types';

export type SelectOption = {
  value: string;
  label: string;
  warehouse_id?: string;
};

export async function getBinOptions(): Promise<SelectOption[]> {
  const collection = await dbc('inventory_bin_options');
  const bins = await collection.find({}).sort({ order: 1 }).toArray();

  return bins.map((bin) => ({
    value: bin.value,
    label: bin.label,
    warehouse_id: bin.warehouse_id,
  }));
}

export async function getInventoryFilterOptions(): Promise<{
  warehouseOptions: WarehouseConfigType[];
  sectorConfigsMap: Record<string, SelectOption[]>;
  binOptions: SelectOption[];
}> {
  const collection = await dbc('inventory_configs');

  const warehouseConfig = await collection.findOne({ config: 'warehouse_options' });

  const warehouseOptions = (warehouseConfig?.options || [])
    .filter((opt: any) => opt.active !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    .map((opt: any) => ({
      value: opt.value,
      label: opt.label,
      order: opt.order || 0,
      active: opt.active,
      type: opt.type || 'basic',
      has_sectors: opt.has_sectors ?? false,
      has_bins: opt.has_bins ?? false,
      sector_config: opt.sector_config,
      bin_warehouse_id: opt.bin_warehouse_id,
    }));

  // Fetch all sector configs for warehouses with sectors
  const sectorConfigsMap: Record<string, SelectOption[]> = {};
  const warehousesWithSectors = warehouseOptions.filter(
    (w: WarehouseConfigType) => w.has_sectors && w.sector_config,
  );

  for (const warehouse of warehousesWithSectors) {
    const sectorConfig = await collection.findOne({ config: warehouse.sector_config });
    if (sectorConfig?.options) {
      sectorConfigsMap[warehouse.value] = sectorConfig.options
        .filter((opt: any) => opt.active !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((opt: any) => ({ value: opt.value, label: opt.label }));
    }
  }

  const binOptions = await getBinOptions();

  return { warehouseOptions, sectorConfigsMap, binOptions };
}

export async function getWarehouseConfig(warehouse: string): Promise<WarehouseConfigType | null> {
  const collection = await dbc('inventory_configs');
  const config = await collection.findOne({ config: 'warehouse_options' });

  const option = config?.options?.find((opt: any) => opt.value === warehouse);

  if (!option) return null;

  return {
    value: option.value,
    label: option.label,
    order: option.order || 0,
    active: option.active,
    type: option.type || 'basic',
    has_sectors: option.has_sectors ?? false,
    has_bins: option.has_bins ?? false,
    sector_config: option.sector_config,
    bin_warehouse_id: option.bin_warehouse_id,
  };
}
