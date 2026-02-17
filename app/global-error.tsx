'use client';

import { unstable_isUnrecognizedActionError } from 'next/navigation';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isStaleAction: boolean = unstable_isUnrecognizedActionError(error);

  useEffect(() => {
    if (isStaleAction) {
      window.location.reload();
    }
  }, [isStaleAction]);

  if (isStaleAction) {
    return (
      <html>
        <body />
      </html>
    );
  }

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              padding: 24,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <h2 style={{ margin: '0 0 8px' }}>Something went wrong!</h2>
            <p style={{ margin: '0 0 16px', color: '#6b7280' }}>
              {error.message}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
