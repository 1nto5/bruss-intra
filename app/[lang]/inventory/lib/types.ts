export type PositionType = {
  position: number;
  identifier: string;
  warehouse: string;
  sector?: string;
  time: string;
  articleNumber: string;
  articleName: string;
  quantity: number;
  unit: string;
  wip: boolean;
  approver: string;
  approvedAt: string;
  comment: string;
  bin: string;
  deliveryDate: Date;
};

export type CardPositionsTableDataType = PositionType & {
  approvedAtLocaleString: string;
  deliveryDateLocaleString: string;
};

export type CardType = {
  number: number;
  creators: string[];
  warehouse: string;
  sector: string;
  time: string;
  positions: PositionType[];
};

export type CardTableDataType = CardType & {
  positionsLength: number;
  approvedPositions: number;
};

export type WarehouseConfigType = {
  value: string;
  label: string;
  order: number;
  active?: boolean;
  type: 'sector_only' | 'basic' | 'bin_required';
  has_sectors: boolean;
  has_bins: boolean;
  sector_config?: string;
  bin_warehouse_id?: string;
};
