import { DefectType } from '../../../lib/types';

export type DefectScanType = {
  _id?: string;
  status: 'defect';
  dmc: string;
  workplace: string;
  article: string;
  operator: string | string[];
  time: string;
  defectKeys: string[];
};

export type DefectScanTableType = DefectScanType & {
  timeLocaleString: string;
};

export type { DefectType };
