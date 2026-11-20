'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApiError } from '../api';

/**
 * Defaults pensados para un CMS:
 *  - `staleTime: 30s`: evita refetches en navegación rápida entre tabs.
 *  - `refetchOnWindowFocus: false`: un refetch confunde al editor en medio
 *    de un form; los refetches van explícitos por mutation.
 *
 * El 401 → /login y el reporte de 5xx viven en `onError` de `lib/api/browser.ts`.
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
              // Un 4xx no cambia por reintentar.
              if (ApiError.is(error) && error.status >= 400 && error.status < 500) {
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
