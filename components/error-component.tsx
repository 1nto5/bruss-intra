'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Terminal } from 'lucide-react';
import { unstable_isUnrecognizedActionError } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';

interface ErrorComponentProps {
  error: Error;
  reset: () => void;
  revalidate?: () => Promise<void>;
}

export default function ErrorComponent({
  error,
  reset,
  revalidate,
}: ErrorComponentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isStaleAction: boolean = unstable_isUnrecognizedActionError(error);

  useEffect(() => {
    if (isStaleAction) {
      window.location.reload();
    }
  }, [isStaleAction]);

  if (isStaleAction) {
    return null;
  }

  const reload = () => {
    startTransition(() => {
      if (revalidate) {
        void revalidate();
      }
      router.refresh();
      reset();
    });
  };

  return (
    <div className='flex items-center justify-center'>
      <Alert className='w-[550px]'>
        <Terminal className='h-4 w-4' />
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription className='space-y-4'>
          <div>{error.message}</div>
          <div className='flex justify-end'>
            <Button onClick={reload} disabled={isPending}>
              {isPending ? <Loader2 className='animate-spin' /> : <RefreshCcw />}
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
