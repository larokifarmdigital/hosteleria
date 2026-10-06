import type { Restaurant } from '../../../domain/models/restaurant.js';

/**
 * Serializa `Restaurant` del dominio al shape público (snake "activeLocales"
 * y "defaultLocale" en vez de `*Code`, fechas en ISO).
 *
 * `completePercent` queda en 0 hasta que calculemos la métrica de completitud
 * (requiere datos del space default, pendiente).
 */
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
