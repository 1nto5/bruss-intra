import { DmcTableDataType, DefectType } from '@/app/[lang]/dmcheck-data/lib/types';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import type { Dictionary } from '../../lib/dict';
import { formatOperators } from '../../lib/utils';

export function createColumns(dict: Dictionary, defects: DefectType[], lang: string): ColumnDef<DmcTableDataType>[] {
  return [
    {
      accessorKey: 'status',
      header: dict.columns.status,
      cell: ({ row }) => {
        const status = row.original.status;
        const baseStatus = status.replace(/\d+$/, '');
        const labels = dict.statusLabels as Record<string, string>;
        return labels[baseStatus] || status;
      },
    },
    {
      accessorKey: 'dmc',
      header: dict.columns.dmc,
    },
    {
      accessorKey: 'timeLocaleString',
      header: dict.columns.time,
    },
    {
      accessorKey: 'article',
      header: dict.columns.article,
      size: 80,
      cell: ({ row }) => (
        <span className="block max-w-[80px] truncate" title={String(row.original.article)}>
          {row.original.article}
        </span>
      ),
    },
    {
      accessorKey: 'operator',
      header: dict.columns.operator,
      cell: ({ row }) => {
        return formatOperators(row.original.operator);
      },
    },
    {
      accessorKey: 'workplace',
      header: dict.columns.workplace,
      cell: ({ row }) => {
        return row.original.workplace.toUpperCase();
      },
    },

    {
      accessorKey: 'hydra_batch',
      header: dict.columns.hydraBatch,
    },
    {
      accessorKey: 'hydra_operator',
      header: dict.columns.hydraOperator,
      cell: ({ row }) => {
        return formatOperators(row.original.hydra_operator);
      },
    },
    {
      accessorKey: 'hydraTimeLocaleString',
      header: dict.columns.hydraTime,
    },
    {
      accessorKey: 'pallet_batch',
      header: dict.columns.palletBatch,
    },
    {
      accessorKey: 'pallet_operator',
      header: dict.columns.palletOperator,
      cell: ({ row }) => {
        return formatOperators(row.original.pallet_operator);
      },
    },
    {
      accessorKey: 'palletTimeLocaleString',
      header: dict.columns.palletTime,
    },
    {
      accessorKey: 'rework_reason',
      header: dict.columns.reworkReason,
    },
    {
      accessorKey: 'rework_user',
      header: dict.columns.reworkUser,
    },
    {
      accessorKey: 'reworkTimeLocaleString',
      header: dict.columns.reworkTime,
    },
    {
      accessorKey: 'defectKeys',
      header: dict.columns.defects,
      cell: ({ row }) => {
        const defectKeys = row.original.defectKeys;
        if (!defectKeys || defectKeys.length === 0) return null;

        return (
          <div className="flex gap-1">
            {defectKeys.map((key) => {
              const defect = defects.find((d) => d.key === key);
              const label = defect?.translations[lang] || key;
              return (
                <Badge key={key} variant="destructive" className="text-xs whitespace-nowrap">
                  {label}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
  ];
}
