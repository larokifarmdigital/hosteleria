'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApiError } from '../http';

/**
 * QueryClientProvider montado una sola vez en RootLayout.
 *
 * Defaults pensados para un CMS:
 * - `staleTime: 30s` — evita refetches en navegación rápida entre tabs.
 * - `refetchOnWindowFocus: false` — en un CMS, el refetch automático al volver
 *   al tab es más molesto que útil (confunde al editor en medio de un form).
 * - `retry` solo en errores de red (status 0/5xx), no en 4xx (no sirve).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            }
          },
          mutations: {
            retry: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
