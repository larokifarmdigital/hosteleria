import type { Restaurant, RestaurantSnapshot } from '../../../../domain/models/restaurant.js';

/**
 * Shape que esperamos de Drizzle con joins incluidos. Lo tipo manualmente
 * (en vez de `typeof restaurants.$inferSelect`) para que el mapper funcione
 * tanto con `findFirst({ with: ... })` como con el row del repository SQL
 * agregado (que ya trae los locales + counts como columnas directas).
 */
export interface RestaurantRow {
  id: string;
  slug: string;
  name: string;
  domain: string;
  logoInitial: string;
  coverGradient: string;
  state: 'published' | 'draft' | 'warnings' | 'new';
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
  acceptsBookings: boolean;
  showSocials: boolean;
  timezone: string;
  rebuildHookUrl: string | null;
  address: unknown;
  contact: unknown;
  socials: unknown;
  seo: unknown;
  lastPublishedAt: Date | null;
  publishedSnapshot: unknown;
  spacesCount: number;
  dishesCount: number;
  winesCount: number;
}

/** Fila Drizzle (con joins/aggregates) → entidad Restaurant. */
export function rowToRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domain: row.domain,
    logoInitial: row.logoInitial,
    coverGradient: row.coverGradient,
    state: row.state,
    defaultLocaleCode: row.defaultLocaleCode,
    activeLocaleCodes: row.activeLocaleCodes,
    acceptsBookings: row.acceptsBookings,
    showSocials: row.showSocials,
    timezone: row.timezone,
    rebuildHookUrl: row.rebuildHookUrl,
    address: (row.address as any) ?? {},
    contact: (row.contact as any) ?? {},
    socials: (row.socials as any) ?? {},
    seo: (row.seo as any) ?? {},
    lastPublishedAt: row.lastPublishedAt,
    publishedSnapshot: (row.publishedSnapshot as RestaurantSnapshot | null) ?? null,
    spacesCount: row.spacesCount,
    dishesCount: row.dishesCount,
    winesCount: row.winesCount
  };
}
