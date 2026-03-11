import {
  DeviationAreaType,
  DeviationReasonType,
} from "@/app/[lang]/deviations/lib/types";

// Extend the TableMeta interface from TanStack Table
declare module "@tanstack/react-table" {
  interface TableMeta<TData> {
    lang?: string;
    reasonOptions?: DeviationReasonType[];
    areaOptions?: DeviationAreaType[];
  }
}
