import { DefectScanTableType, DefectType } from '../../lib/types';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import type { Dictionary } from '../../lib/dict';

function formatOperators(operator: string | string[] | undefined): string {
  if (!operator) return '';
  if (Array.isArray(operator)) {
    return operator.join(', ');
  }
  return operator;
}

export function createColumns(
  dict: Dictionary,
  defects: DefectType[],
  lang: string
): ColumnDef<DefectScanTableType>[] {
  return [
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
    },
    {
      accessorKey: 'workplace',
      header: dict.columns.workplace,
      cell: ({ row }) => {
        return row.original.workplace.toUpperCase();
      },
    },
    {
      accessorKey: 'operator',
      header: dict.columns.operator,
      cell: ({ row }) => {
        return formatOperators(row.original.operator);
      },
    },
    {
      accessorKey: 'defectKeys',
      header: dict.columns.defects,
      cell: ({ row }) => {
        const defectKeys = row.original.defectKeys;
        if (!defectKeys || defectKeys.length === 0) return null;

        return (
          <div className='flex gap-1'>
            {defectKeys.map((key) => {
              const defect = defects.find((d) => d.key === key);
              const label = defect?.translations[lang] || key;
              return (
                <Badge key={key} variant='destructive' className='text-xs whitespace-nowrap'>
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
