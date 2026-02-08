export type DmcheckConfigFull = {
  _id: string;
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
  nonUniqueHydraBatch?: boolean;
  requireDmcPartVerification?: boolean;
  enableDefectReporting?: boolean;
  requireDefectApproval?: boolean;
  defectGroup?: string;
};

export const WORKPLACES = [
  'eol29',
  'eol308',
  'eol405',
  'eol43',
  'eol45',
  'eol45-200',
  'eol488',
  'eol74',
  'eol74-200',
  'eol80',
  'eol810',
  'fw1',
  'fw2',
  'fw3',
  'fw4',
  'fw5',
  'quality',
] as const;
