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
  foundedYear: number | null;
  branding: unknown;
  homeBlocks: unknown;
  about: unknown;
  groups: unknown;
  mapUrl: string | null;
  showReviews: boolean;
  uiTexts: unknown;
  faq: unknown;
  aiSummary: unknown;
  analyticsToken: string | null;
  business: unknown;
  // La SQL cruda del repo devuelve el timestamp como string; `findFirst` lo da como Date.
  lastPublishedAt: Date | string | null;
  lastRebuildAt: Date | string | null;
  lastRebuildOk: boolean | null;
  publishedSnapshot: unknown;
  spacesCount: number;
  dishesCount: number;
  drinksCount: number;
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
    foundedYear: row.foundedYear ?? null,
    branding: (row.branding as any) ?? {},
    homeBlocks: (row.homeBlocks as any) ?? [],
    about: (row.about as any) ?? {},
    groups: (row.groups as any) ?? {},
    mapUrl: row.mapUrl ?? null,
    showReviews: row.showReviews ?? false,
    uiTexts: (row.uiTexts as any) ?? {},
    faq: (row.faq as any) ?? {},
    aiSummary: (row.aiSummary as any) ?? {},
    analyticsToken: row.analyticsToken ?? null,
    business: (row.business as any) ?? {},
    lastPublishedAt: row.lastPublishedAt ? new Date(row.lastPublishedAt) : null,
    lastRebuildAt: row.lastRebuildAt ? new Date(row.lastRebuildAt) : null,
    lastRebuildOk: row.lastRebuildOk ?? null,
    publishedSnapshot: (row.publishedSnapshot as RestaurantSnapshot | null) ?? null,
    spacesCount: row.spacesCount,
    dishesCount: row.dishesCount,
    drinksCount: row.drinksCount,
    winesCount: row.winesCount
  };
}
