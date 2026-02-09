import type { DefectScanTableType } from './types';
import { formatDateTime } from '@/lib/utils/date-format';

export async function getDefectScans(
  searchParams: { [key: string]: string | undefined }
): Promise<{
  fetchTimeLocaleString: string;
  fetchTime: Date;
  data: DefectScanTableType[];
}> {
  // Build query params - always filter for status=defect
  const params = new URLSearchParams({ status: 'defect' });

  // Add other filters
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const url = `${process.env.API}/dmcheck-data/dmc?${params.toString()}`;

  const res = await fetch(url, {
    next: { revalidate: 0, tags: ['dmcheck-data-dmc'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getDefectScans error: ${res.status} ${res.statusText} ${json.error}`
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  let data: DefectScanTableType[] = await res.json();
  data = data.map((item) => ({
    ...item,
    timeLocaleString: formatDateTime(item.time),
  }));

  return { fetchTimeLocaleString, fetchTime, data };
}
