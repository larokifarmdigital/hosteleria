/** Keys jerárquicas para invalidar por prefijo: `qk.restaurants.all` invalida
 *  todo lo de restaurantes, `lists()` solo los listados, `detail(slug)` uno. */
export const qk = {
  auth: {
    all: ['auth'] as const,
    session: () => [...qk.auth.all, 'session'] as const
  },
  restaurants: {
    all: ['restaurants'] as const,
    lists: () => [...qk.restaurants.all, 'list'] as const,
    list: () => qk.restaurants.lists(),
    details: () => [...qk.restaurants.all, 'detail'] as const,
    detail: (slug: string) => [...qk.restaurants.details(), slug] as const
  },
  spaces: {
    all: ['spaces'] as const,
    byRestaurant: (restaurantSlug: string) =>
      [...qk.spaces.all, 'byRestaurant', restaurantSlug] as const,
    detail: (restaurantSlug: string, spaceId: string) =>
      [...qk.spaces.all, 'detail', restaurantSlug, spaceId] as const
  },
  pendingTasks: {
    all: ['pendingTasks'] as const,
    byRestaurant: (restaurantSlug: string, stamp: number = 0) => [...qk.pendingTasks.all, restaurantSlug, stamp] as const
  },
  /** Cambios sin publicar en carta, vinos, legales y espacios. */
  siteChanges: {
    all: ['siteChanges'] as const,
    byRestaurant: (restaurantSlug: string) => [...qk.siteChanges.all, restaurantSlug] as const
  },
  siteStatus: {
    all: ['siteStatus'] as const,
    byRestaurant: (restaurantSlug: string) => [...qk.siteStatus.all, restaurantSlug] as const
  },
  legalPages: {
    all: ['legalPages'] as const,
    byRestaurant: (restaurantSlug: string) => [...qk.legalPages.all, restaurantSlug] as const
  },
  dishes: {
    all: ['dishes'] as const,
    list: (filters?: { restaurantSlug?: string; categoryId?: string; missingLocale?: string }) =>
      [...qk.dishes.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...qk.dishes.all, 'detail', id] as const,
    categories: (spaceId?: string, kind?: string) => [...qk.dishes.all, 'categories', spaceId ?? null, kind ?? 'dish'] as const
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
    lists: () => [...qk.media.all, 'list'] as const,
    list: (filters?: { restaurantSlug?: string; usage?: string; missingAlt?: boolean }) =>
      [...qk.media.lists(), filters ?? {}] as const,
    detail: (id: string) => [...qk.media.all, 'detail', id] as const
  }
} as const;
