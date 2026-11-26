'use client';

import { useState, type ReactNode } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApiError } from '../api';
import { qk } from './keys';

/**
 * Defaults pensados para un CMS:
 *  - `staleTime: 30s`: evita refetches en navegación rápida entre tabs.
 *  - `refetchOnWindowFocus: false`: un refetch confunde al editor en medio
 *    de un form; los refetches van explícitos por mutation.
 *
 * El 401 → /login y el reporte de 5xx viven en `onError` de `lib/api/browser.ts`.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    // Cualquier cambio guardado (un plato, un texto legal, el orden de los espacios…) puede
    // cambiar lo que queda por publicar: las marcas «Sin publicar» se vuelven a pedir.
    const mutationCache = new MutationCache({
      // El guardado automático de la ficha y del espacio no toca carta, legales ni espacios: no cuenta
      // (`meta.keepsSiteChanges`), y así no se gasta una petición por cada guardado.
      onSuccess: (_data, _vars, _ctx, mutation) => {
        if (mutation.meta?.keepsSiteChanges) return;
        void client.invalidateQueries({ queryKey: qk.siteChanges.all });
      }
    });
    const client: QueryClient =
      new QueryClient({
        mutationCache,
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
      });
    return client;
  });

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
