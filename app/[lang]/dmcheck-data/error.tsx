'use client';

import ErrorComponent from '@/components/error-component';
import { revalidateDmcheckTableData as revalidate } from './actions/revalidation';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ErrorComponent error={error} reset={reset} revalidate={revalidate} />;
}
