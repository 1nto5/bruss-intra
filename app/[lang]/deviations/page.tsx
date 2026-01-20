import {
  ApprovalType,
  DeviationType,
} from '@/app/[lang]/deviations/lib/types';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button'; // Import Button
import {
  Card, // Keep CardDescription import if used elsewhere, otherwise remove
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Locale } from '@/lib/config/i18n';
import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import { KeyRound, Plus } from 'lucide-react'; // Import Plus icon
import { Session } from 'next-auth';
import LocalizedLink from '@/components/localized-link';
import TableFilteringAndOptions from './components/table-filtering-and-options';
import { getDictionary } from './lib/dict';
import { DataTable } from './components/table/data-table';
import {
  getConfigAreaOptions,
  getConfigReasonOptions,
} from './lib/get-configs';
import { DeviationAreaType, DeviationReasonType } from './lib/types'; // Import ConfigOption

async function getAllDeviations(
  lang: string,
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  deviations: DeviationType[];
}> {
  const filteredSearchParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );

  const queryParams = new URLSearchParams(filteredSearchParams).toString();
  const res = await fetch(`${process.env.API}/deviations/?${queryParams}`, {
    // next: { revalidate: 30, tags: ['deviations'] },
    // next: { tags: ['deviations'] },
    cache: 'no-store',
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getAllDeviations error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  const deviations: DeviationType[] = await res.json();
  const deviationsFiltered = deviations.filter(
    (deviation: DeviationType) => deviation.status !== 'draft',
  );

  const formatDeviation = (deviation: DeviationType) => {
    const formattedTimePeriod = {
      from: deviation.timePeriod?.from
        ? formatDate(deviation.timePeriod.from)
        : '',
      to: deviation.timePeriod?.to
        ? formatDate(deviation.timePeriod.to)
        : '',
    };
    return { ...deviation, timePeriodLocalDateString: formattedTimePeriod };
  };

  const deviationsFormatted = deviationsFiltered.map(formatDeviation);

  return { fetchTime, fetchTimeLocaleString, deviations: deviationsFormatted };
}

const approvalMapping: { [key: string]: keyof DeviationType } = {
  'group-leader': 'groupLeaderApproval',
  'quality-manager': 'qualityManagerApproval',
  'production-manager': 'productionManagerApproval',
  'plant-manager': 'plantManagerApproval',
};

const APPROVAL_ROLES = ['group-leader', 'quality-manager', 'production-manager', 'plant-manager'];

function needsUserApproval(
  deviation: DeviationType,
  userRoles: string[],
): boolean {
  if (deviation.status === 'draft' || deviation.status === 'rejected') {
    return false;
  }
  return userRoles.some((role) => {
    const approvalField = approvalMapping[role];
    if (!approvalField) return false;
    const approval = deviation[approvalField] as ApprovalType | undefined;
    return !approval?.approved;
  });
}

async function getUserDeviations(
  lang: string,
  session: Session,
  searchParams: { [key: string]: string | undefined } = {},
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  deviations: DeviationType[];
}> {
  // Remove toApprove from params sent to API (handled here)
  const { toApprove, ...apiParams } = searchParams;
  const filteredSearchParams = Object.fromEntries(
    Object.entries(apiParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );

  const queryParams = new URLSearchParams(filteredSearchParams).toString();
  const res = await fetch(`${process.env.API}/deviations/?${queryParams}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getUserDeviations error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);
  const deviations: DeviationType[] = await res.json();
  const userRoles = session.user?.roles || [];

  const formatDeviation = (deviation: DeviationType) => {
    const formattedTimePeriod = {
      from: deviation.timePeriod?.from
        ? formatDate(deviation.timePeriod.from)
        : '',
      to: deviation.timePeriod?.to
        ? formatDate(deviation.timePeriod.to)
        : '',
    };
    return { ...deviation, timePeriodLocalDateString: formattedTimePeriod };
  };

  // Filter based on toApprove param
  if (toApprove === 'true') {
    const filtered = deviations
      .filter((d) => needsUserApproval(d, userRoles))
      .map((d) => ({ ...d, status: 'to approve' as const }))
      .map(formatDeviation);
    return { fetchTime, fetchTimeLocaleString, deviations: filtered };
  }

  // Filter drafts - only show user's own drafts
  if (searchParams.status === 'draft') {
    const filtered = deviations
      .filter((d) => d.owner === session.user?.email)
      .map(formatDeviation);
    return { fetchTime, fetchTimeLocaleString, deviations: filtered };
  }

  // Default: show all non-drafts, mark items needing approval
  const filtered = deviations
    .filter((d) => d.status !== 'draft')
    .map((d) => {
      if (needsUserApproval(d, userRoles)) {
        return { ...d, status: 'to approve' as const };
      }
      return d;
    })
    .map(formatDeviation);

  return { fetchTime, fetchTimeLocaleString, deviations: filtered };
}

export default async function DeviationsPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;

  const { lang } = params;
  const dict = await getDictionary(lang);

  let fetchTime, fetchTimeLocaleString, deviations;
  const session = await auth();
  const reasonOptions: DeviationReasonType[] = await getConfigReasonOptions(); // Ensure type
  const areaOptions: DeviationAreaType[] = await getConfigAreaOptions(); // Ensure type
  const searchParams = await props.searchParams;

  if (!session) {
    ({ fetchTime, fetchTimeLocaleString, deviations } = await getAllDeviations(
      lang,
      searchParams,
    ));
  } else {
    ({ fetchTime, fetchTimeLocaleString, deviations } = await getUserDeviations(
      lang,
      session,
      searchParams,
    ));
  }

  return (
    <Card>
      <CardHeader>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>{dict.title}</CardTitle>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            {session ? (
              <LocalizedLink href='/deviations/add'>
                <Button variant={'outline'} className='w-full sm:w-auto'>
                  <Plus /> <span>{dict.addNew}</span>
                </Button>
              </LocalizedLink>
            ) : (
              <LocalizedLink href={`/auth?callbackUrl=/deviations`}>
                <Button variant={'outline'} className='w-full sm:w-auto'>
                  <KeyRound /> <span>{dict.login}</span>
                </Button>
              </LocalizedLink>
            )}
          </div>
        </div>
        {/* Remove CardDescription with sync time */}
        {/* <CardDescription>
          Ostatnia synchronizacja: {fetchTimeLocaleString}
        </CardDescription> */}
        <TableFilteringAndOptions
          fetchTime={fetchTime}
          isLogged={!!session}
          userEmail={session?.user?.email || undefined}
          hasApprovalRole={session?.user?.roles?.some((r) => APPROVAL_ROLES.includes(r))}
          areaOptions={areaOptions}
          reasonOptions={reasonOptions}
          dict={dict}
        />
      </CardHeader>
      <DataTable
        data={deviations}
        fetchTimeLocaleString={fetchTimeLocaleString} // Keep prop if DataTable needs it
        lang={lang}
        reasonOptions={reasonOptions}
        areaOptions={areaOptions}
        dict={dict}
      />
    </Card>
  );
}
