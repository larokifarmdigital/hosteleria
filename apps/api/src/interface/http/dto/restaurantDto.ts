import type { Restaurant } from '../../../domain/models/restaurant.js';

// La UI espera `activeLocales` / `defaultLocale` (sin sufijo `Code`) y
// fechas en ISO. `completePercent` queda en 0: la métrica real necesita
// datos del space default (pendiente).
export function restaurantToDto(r: Restaurant) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    domain: r.domain,
    logoInitial: r.logoInitial,
    coverGradient: r.coverGradient,
    state: r.state,
    activeLocales: r.activeLocaleCodes,
    defaultLocale: r.defaultLocaleCode,
    acceptsBookings: r.acceptsBookings,
    showSocials: r.showSocials,
    timezone: r.timezone,
    rebuildHookUrl: r.rebuildHookUrl,
    address: r.address,
    contact: r.contact,
    socials: r.socials,
    seo: r.seo,
    lastPublishedAt: r.lastPublishedAt?.toISOString() ?? null,
    completePercent: 0,
    spacesCount: r.spacesCount,
    dishesCount: r.dishesCount,
    winesCount: r.winesCount
  };
}
