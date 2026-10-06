import { eq } from 'drizzle-orm';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { restaurants } from '../infrastructure/persistence/drizzle/schema/content.js';
import { countByRestaurant, getActiveLocaleCodes } from './stats.js';
import type { RestaurantListRow } from './repository.js';
import type { Env } from '../env.js';

/**
 * Helpers para construir el DTO público del Restaurant.
 *
 * El shape es idéntico al tipo `Restaurant` que consumen el backoffice y
 * las landings. Dos funciones:
 *
 *  - `toDto()` — para endpoints de UN restaurante (GET /:slug, POST, PATCH, discard).
 *    Hace 3 queries (restaurant + locales + counts).
 *  - `aggregatedRowToDto()` — para el listado (GET /restaurants). Lee del
 *    row ya pre-agregado por `repository.listRestaurantsAggregated()`
 *    (1 sola query SQL).
 */

/**
 * Carga el restaurante + sus derivados y devuelve el DTO final.
 * Devuelve `null` si el restaurante no existe.
 */
export async function toDto(env: Env, restaurantId: string) {
  const db = getDb(env.DATABASE_URL);
  const r = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    with: { defaultLocale: true }
  });
  if (!r) return null;

  const [activeLocales, counters] = await Promise.all([
    getActiveLocaleCodes(env, restaurantId),
    countByRestaurant(env, restaurantId)
  ]);

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    domain: r.domain,
    logoInitial: r.logoInitial,
    coverGradient: r.coverGradient,
    state: r.state,
    activeLocales,
    defaultLocale: r.defaultLocale.code,
    acceptsBookings: r.acceptsBookings,
    showSocials: r.showSocials,
    timezone: r.timezone,
    rebuildHookUrl: r.rebuildHookUrl,
    address: r.address ?? {},
    contact: r.contact ?? {},
    socials: r.socials ?? {},
    seo: r.seo ?? {},
    lastPublishedAt: r.lastPublishedAt?.toISOString() ?? null,
    completePercent: 0, // TODO: calcular tras cargar hero del space default
    spacesCount: counters.spacesCount,
    dishesCount: counters.dishesCount,
    winesCount: counters.winesCount
  };
}

/**
 * Convierte el row que devuelve `listRestaurantsAggregated` (SQL raw con
 * JOINs + array_agg + subqueries) al mismo shape que `toDto`. NO ejecuta
 * queries extra — el row ya trae todo.
 */
export function aggregatedRowToDto(r: RestaurantListRow) {
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
    address: r.address ?? {},
    contact: r.contact ?? {},
    socials: r.socials ?? {},
    seo: r.seo ?? {},
    lastPublishedAt: r.lastPublishedAt?.toISOString() ?? null,
    completePercent: 0,
    spacesCount: r.spacesCount,
    dishesCount: r.dishesCount,
    winesCount: r.winesCount
  };
}
