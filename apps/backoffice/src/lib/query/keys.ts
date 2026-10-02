/**
 * Factory de query keys — una sola fuente de verdad para TanStack Query.
 *
 * Convención: cada recurso expone `all`, `lists()`, `list(filters)`, `details()`,
 * `detail(id)`. Permite invalidar granular:
 *   - `qk.restaurants.all` → invalida TODO lo de restaurantes
 *   - `qk.restaurants.lists()` → solo listados (no detalles abiertos)
 *   - `qk.restaurants.detail('casabella')` → un solo detalle
 *
 * Patrón: https://tkdodo.eu/blog/effective-react-query-keys
 */
export const qk = {
  auth: {
    all: ['auth'] as const,
    session: () => [...qk.auth.all, 'session'] as const
  },
  restaurants: {
    all: ['restaurants'] as const,
    lists: () => [...qk.restaurants.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...qk.restaurants.lists(), filters ?? {}] as const,
    details: () => [...qk.restaurants.all, 'detail'] as const,
    detail: (slug: string) => [...qk.restaurants.details(), slug] as const
  },
  spaces: {
    all: ['spaces'] as const,
    byRestaurant: (restaurantSlug: string) => [...qk.spaces.all, 'byRestaurant', restaurantSlug] as const,
    detail: (restaurantSlug: string, spaceId: string) =>
      [...qk.spaces.all, 'detail', restaurantSlug, spaceId] as const
  },
  dishes: {
    all: ['dishes'] as const,
    list: (filters?: { restaurantSlug?: string; categoryId?: string; missingLocale?: string }) =>
      [...qk.dishes.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...qk.dishes.all, 'detail', id] as const,
    categories: (spaceId?: string) => [...qk.dishes.all, 'categories', spaceId ?? null] as const
  },
  wines: {
    all: ['wines'] as const,
    list: (filters?: { restaurantSlug?: string; categoryId?: string }) =>
      [...qk.wines.all, 'list', filters ?? {}] as const,
    categories: (spaceId?: string) => [...qk.wines.all, 'categories', spaceId ?? null] as const
  },
  languages: {
    all: ['languages'] as const,
    list: () => [...qk.languages.all, 'list'] as const
  },
  users: {
    all: ['users'] as const,
    list: () => [...qk.users.all, 'list'] as const,
    detail: (id: string) => [...qk.users.all, 'detail', id] as const
  },
  media: {
    all: ['media'] as const,
    list: (filters?: { restaurantSlug?: string; usage?: string; missingAlt?: boolean }) =>
      [...qk.media.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...qk.media.all, 'detail', id] as const
  }
} as const;
