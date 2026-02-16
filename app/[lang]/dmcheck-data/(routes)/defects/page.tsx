import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale } from '@/lib/config/i18n';
import TableFilteringAndOptions from './components/table-filtering';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { getDefectScans } from './lib/get-defect-scans';
import { getArticles } from '../../lib/get-articles';
import { getDefects } from '../../lib/get-defects';
import LocalizedLink from '@/components/localized-link';
import { ArrowLeft } from 'lucide-react';

export default async function DefectsPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;

  const dict = await getDictionary(lang);
  const { fetchTime, fetchTimeLocaleString, data } = await getDefectScans(searchParams);
  const articles = await getArticles();
  const defects = await getDefects();

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between mb-4'>
          <CardTitle>{dict.title}</CardTitle>
          <LocalizedLink href='/dmcheck-data'>
            <Button variant='outline'>
              <ArrowLeft />
              <span>DMCheck Data</span>
            </Button>
          </LocalizedLink>
        </div>
        <TableFilteringAndOptions
          articles={articles}
          defects={defects}
          fetchTime={fetchTime}
          dict={dict}
          lang={lang}
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
