import type { DmcTableDataType } from './types';
import { formatDateTime } from '@/lib/utils/date-format';

export async function getScans(
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTimeLocaleString: string;
  fetchTime: Date;
  data: DmcTableDataType[];
}> {
  const filteredSearchParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );

  const queryParams = new URLSearchParams(filteredSearchParams).toString();
  const url = `${process.env.API}/dmcheck-data/dmc?${queryParams}`;

  const res = await fetch(url, {
    next: { revalidate: 0, tags: ['dmcheck-data-dmc'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getScans error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  let data: DmcTableDataType[] = await res.json();
  data = data.map((item) => ({
    ...item,
    timeLocaleString: formatDateTime(item.time),
    hydraTimeLocaleString: item.hydra_time
      ? formatDateTime(item.hydra_time)
      : '',
    palletTimeLocaleString: item.pallet_time
      ? formatDateTime(item.pallet_time)
      : '',
    reworkTimeLocaleString: item.rework_time
      ? formatDateTime(item.rework_time)
      : '',
  }));

  return { fetchTimeLocaleString, fetchTime, data };
}
