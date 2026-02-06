import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDictionary } from '@/lib/dict';
import { Info } from 'lucide-react';

export default async function HomePage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const session = await auth();

  if (!session) {
    redirect(`/${lang}/auth?callbackUrl=/`);
  }

  const dict = await getDictionary(lang);

  const displayName =
    session.user?.displayName ||
    (session.user?.email ? extractNameFromEmail(session.user.email) : '');

  return (
    <Alert className="mx-auto max-w-md">
      <Info className="h-4 w-4" />
      <AlertTitle>{dict.home.title}!</AlertTitle>
      <AlertDescription>
        {dict.home.loggedInAs} {displayName}.
      </AlertDescription>
    </Alert>
  );
}
