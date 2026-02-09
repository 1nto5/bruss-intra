export type DmcType = {
  status: "box" | "pallet" | "warehouse" | "rework" | "defect";
  pallet: string;
  dmc: string;
  workplace: string;
  article: string;
  operator: string | string[]; // Support both string (legacy) and array (new)
  time: string;
  hydra_batch?: string;
  hydra_operator?: string | string[]; // New field for hydra operator
  hydra_time?: string;
  pallet_batch?: string;
  pallet_time?: string;
  pallet_operator?: string | string[]; // Support both formats for pallet operator
  rework_reason?: string;
  rework_user?: string;
  rework_time?: string;
  defectKeys?: string[];
};

export type DmcTableDataType = DmcType & {
  timeLocaleString: string;
  reworkTimeLocaleString: string;
};

export type ArticleConfigType = {
  _id?: string;
  workplace: string;
  articleNumber: string;
  articleName: string;
  articleNote?: string;
  piecesPerBox: number;
  pallet?: boolean;
  boxesPerPallet?: number;
  dmc: string;
  dmcFirstValidation: string;
  secondValidation?: boolean;
  dmcSecondValidation?: string;
  hydraProcess: string;
  ford?: boolean;
  bmw?: boolean;
  enableDefectReporting?: boolean;
};

export type DefectType = {
  _id?: string;
  key: string;
  category: string;
  group: string;
  order: number;
  translations: {
    [key: string]: string; // e.g., { "pl": "Uszkodzona uszczelka PD", "en": "Damaged PD seal", "de": "..." }
  };
};
