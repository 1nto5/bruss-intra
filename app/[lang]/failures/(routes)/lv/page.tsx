import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Locale } from '@/lib/config/i18n';
import getEmployees from '@/lib/data/get-employees';
import { formatDateTime } from '@/lib/utils/date-format';
import { getDictionary } from '../../lib/dict';
import AddFailureDialog from './components/add-failure-dialog';
import TableFiltering from './components/table-filtering';
import { DataTable } from './components/table/data-table';
import { FailureOptionType, FailureType } from './lib/types';

async function getFailuresOptions(): Promise<FailureOptionType[]> {
  const res = await fetch(`${process.env.API}/failures/lv/options`, {
    next: {
      revalidate: 60 * 60 * 8,
      tags: ['failures-lv-options'],
    },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getFailuresOptions error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  return res.json();
}

async function getFailures(
  lang: string,
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTime: Date;
  formattedFailures: FailureType[];
}> {
  const queryParams = new URLSearchParams(
    Object.entries(searchParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  ).toString();
  const res = await fetch(`${process.env.API}/failures/lv?${queryParams}`, {
    next: { revalidate: 0, tags: ['failures-lv'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getFailures error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const failures: FailureType[] = await res.json();

  const formattedFailures: FailureType[] = failures.map((failure) => ({
    ...failure,
    fromLocaleString: formatDateTime(failure.from),
    toLocaleString: failure.to ? formatDateTime(failure.to) : '',
    createdAtLocaleString: formatDateTime(failure.createdAt),
    updatedAtLocaleString: failure.updatedAt
      ? formatDateTime(failure.updatedAt)
      : '',
  }));

  return { fetchTime, formattedFailures };
}

export default async function FailuresPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);

  const [{ fetchTime, formattedFailures }, failuresOptions, employees] =
    await Promise.all([
      getFailures(lang, searchParams),
      getFailuresOptions(),
      getEmployees(),
    ]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between mb-4'>
          <CardTitle>{dict.title}</CardTitle>
          <AddFailureDialog
            failuresOptions={failuresOptions}
            employees={employees}
            lang={lang}
            dict={dict}
          />
        </div>
        <TableFiltering
          fetchTime={fetchTime}
          failuresOptions={failuresOptions}
          employees={employees}
          dict={dict}
        />
      </CardHeader>
      <DataTable
        data={formattedFailures}
        fetchTime={fetchTime}
        employees={employees}
        lang={lang}
        dict={dict}
      />
    </Card>
  );
}
