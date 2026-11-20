import 'server-only';
import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient server-side por request.
 *
 * `cache()` de React garantiza que todas las llamadas dentro del mismo
 * render RSC comparten la MISMA instancia, para que si varios `prefetch*`
 * se ejecutan en paralelo, hidraten juntos al cliente.
 *
 * Los defaults deben coincidir con los del `provider.tsx` del cliente;
 * si divergen, el rehidrate hace refetch innecesario.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          refetchOnWindowFocus: false
        }
      }
    })
);
