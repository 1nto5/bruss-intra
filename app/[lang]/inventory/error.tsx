'use client';

import ErrorComponent from '@/components/error-component';
import { revalidateAll as revalidate } from './actions/utils';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ErrorComponent error={error} reset={reset} revalidate={revalidate} />;
}
