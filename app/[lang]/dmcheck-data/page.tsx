import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Locale } from '@/lib/config/i18n';
import DmcTableFilteringAndOptions from './components/table-filtering';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { getArticles } from './lib/get-articles';
import { getDefects } from './lib/get-defects';
import { getScans } from './lib/get-scans';
import LocalizedLink from '@/components/localized-link';
import { AlertTriangle } from 'lucide-react';

export default async function InventoryPage(props: {
  params: Promise<{ lang: Locale }>;
  // searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;

  const dict = await getDictionary(lang);
  const { fetchTime, fetchTimeLocaleString, data } = await getScans(searchParams);
  const articles = await getArticles();
  const defects = await getDefects();

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between mb-4'>
          <CardTitle>{dict.title}</CardTitle>
          <LocalizedLink href='/dmcheck-data/defects'>
            <Button variant='outline'>
              <AlertTriangle />
              <span>{dict.defectsButton}</span>
            </Button>
          </LocalizedLink>
        </div>
        <DmcTableFilteringAndOptions
          articles={articles}
          fetchTime={fetchTime}
          dict={dict}
        />
      </CardHeader>
      <DataTable
        data={data}
        defects={defects}
        fetchTime={fetchTime}
        fetchTimeLocaleString={fetchTimeLocaleString}
        lang={lang}
        dict={dict}
      />
    </Card>
  );
}
