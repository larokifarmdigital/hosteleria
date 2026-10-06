import type { Restaurant, RestaurantSnapshot } from '../../../../domain/models/restaurant.js';

/**
 * Tipo manual (no `$inferSelect`) para que admita tanto el row del SELECT
 * crudo con `array_agg` + counts del repo como el shape de un `findFirst`
 * con joins.
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
