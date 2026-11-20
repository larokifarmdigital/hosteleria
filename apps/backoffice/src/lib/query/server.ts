import 'server-only';
import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';

/** `cache()` da una instancia por render RSC, para que todos los `prefetch*`
 *  hidraten juntos. `staleTime` debe coincidir con el de `provider.tsx`: si
 *  diverge, el cliente refetchea nada más hidratar. */
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
