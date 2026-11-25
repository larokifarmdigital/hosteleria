import type { Restaurant } from '@/core/restaurants';
import type { UserRole } from '@/core/auth/domain';

// La UI espera `activeLocales` / `defaultLocale` (sin sufijo `Code`) y
// fechas en ISO. `completePercent` va fijo en 0: la métrica real necesita
// datos del space default, que aquí no se cargan.
export function restaurantToDto(r: Restaurant, viewer: { role: UserRole }) {
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
    // Quien tiene la URL del hook puede regenerar la web sin pasar por el api.
    rebuildHookUrl: viewer.role === 'admin' ? r.rebuildHookUrl : null,
    address: r.address,
    contact: r.contact,
    socials: r.socials,
    seo: r.seo,
    foundedYear: r.foundedYear,
    branding: r.branding,
    homeBlocks: r.homeBlocks,
    about: r.about,
    groups: r.groups,
    mapUrl: r.mapUrl,
    showReviews: r.showReviews,
    uiTexts: r.uiTexts,
    faq: r.faq,
    aiSummary: r.aiSummary,
    analyticsToken: r.analyticsToken,
    business: r.business,
    lastPublishedAt: r.lastPublishedAt?.toISOString() ?? null,
    // Lo último publicado: el backoffice lo compara con lo actual para
    // resumir qué cambia antes de publicar.
    publishedSnapshot: r.publishedSnapshot,
    completePercent: 0,
    spacesCount: r.spacesCount,
    dishesCount: r.dishesCount,
    drinksCount: r.drinksCount,
    unpublishedSpacesCount: r.unpublishedSpacesCount,
    winesCount: r.winesCount
  };
}
