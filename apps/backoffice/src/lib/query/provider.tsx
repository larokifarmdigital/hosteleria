'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApiError } from '../api';

/**
 * QueryClientProvider montado una sola vez en RootLayout.
 *
 * Defaults pensados para un CMS:
 *  - `staleTime: 30s` — evita refetches en navegación rápida entre tabs.
 *  - `refetchOnWindowFocus: false` — en un CMS confunde al editor en medio
 *    de un form; mejor dejar los refetches explícitos por mutation.
 *  - `retry` solo en 5xx/network, no en 4xx (no sirve).
 *
 * Los side-effects cross-cutting (401 → /login, 5xx → reportError) viven
 * en `onError` del `api` del browser (`lib/api/browser.ts`).
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
              // 4xx: no retry (es error de usuario/validación).
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
