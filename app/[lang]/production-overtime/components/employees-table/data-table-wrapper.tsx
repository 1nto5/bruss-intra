'use client';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { Dictionary } from '../../lib/dict';
import { overtimeRequestEmployeeType } from '../../lib/types';

interface DataTableWrapperProps {
  data: overtimeRequestEmployeeType[];
  id: string;
  status?: string;
  dict: Dictionary;
}

export function DataTableWrapper({
  data,
  id,
  status,
  dict,
}: DataTableWrapperProps) {
  const columns = getColumns(dict);

  return (
    <DataTable columns={columns} data={data} id={id} status={status} dict={dict} />
  );
}
