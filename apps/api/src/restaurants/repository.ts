import { sql } from 'drizzle-orm';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import type { Env } from '../env.js';

/**
 * Query optimizada para el listado del dashboard: devuelve TODOS los
 * restaurantes con sus campos derivados (locales activos, counts de
 * spaces/dishes/wines) en **una sola** llamada SQL.
 *
 * **Por qué existe este archivo**: el enfoque "idiomático" sería iterar
 * los restaurantes y para cada uno llamar `getActiveLocaleCodes()` +
 * `countByRestaurant()`. Eso son 4 queries por restaurante (N+1 problem).
 * Con 60 restaurantes = 240 queries y la pantalla se arrastra.
 *
 * Esta implementación usa un SQL con `LEFT JOIN` + `array_agg` para
 * locales + subqueries con `COUNT(*)` para counters. Total: 1 query,
 * independiente de cuántos restaurantes haya.
 */

export interface RestaurantListRow {
  id: string;
  slug: string;
  name: string;
  domain: string;
  logoInitial: string;
  coverGradient: string;
  state: 'published' | 'draft' | 'warnings' | 'new';
  timezone: string;
  rebuildHookUrl: string | null;
  acceptsBookings: boolean;
  showSocials: boolean;
  address: any;
  contact: any;
  socials: any;
  seo: any;
  lastPublishedAt: Date | null;
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
  spacesCount: number;
  dishesCount: number;
  winesCount: number;
}

/**
 * Lista restaurantes agregados.
 *
 * Dónde se usa:
 *  - `routes/restaurants.ts` → GET /restaurants (listado del dashboard).
 *
 * @param opts.allowedIds - Si se pasa, filtra solo esos IDs (para editors
 *   que no son admin — solo ven los restaurantes asignados a ellos).
 *   Array vacío = user sin acceso a ningún restaurante → `[]`.
 */
export async function listRestaurantsAggregated(
  env: Env,
  opts: { allowedIds?: string[] } = {}
): Promise<RestaurantListRow[]> {
  const db = getDb(env.DATABASE_URL);

  if (opts.allowedIds?.length === 0) return [];

  const whereClause = opts.allowedIds && opts.allowedIds.length > 0
    ? sql`WHERE r.id = ANY(${opts.allowedIds})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      r.id, r.slug, r.name, r.domain, r.logo_initial AS "logoInitial",
      r.cover_gradient AS "coverGradient", r.state, r.timezone,
      r.rebuild_hook_url AS "rebuildHookUrl",
      r.accepts_bookings AS "acceptsBookings", r.show_socials AS "showSocials",
      r.address, r.contact, r.socials, r.seo,
      r.last_published_at AS "lastPublishedAt",
      dl.code AS "defaultLocaleCode",
      COALESCE(
        (SELECT array_agg(l.code ORDER BY l.code)
         FROM restaurant_locales rl
         JOIN languages l ON l.id = rl.language_id
         WHERE rl.restaurant_id = r.id),
        ARRAY[]::text[]
      ) AS "activeLocaleCodes",
      (SELECT COUNT(*)::int FROM spaces s WHERE s.restaurant_id = r.id) AS "spacesCount",
      (SELECT COUNT(*)::int FROM dishes d
         JOIN spaces s ON s.id = d.space_id
         WHERE s.restaurant_id = r.id) AS "dishesCount",
      (SELECT COUNT(*)::int FROM wines w
         JOIN spaces s ON s.id = w.space_id
         WHERE s.restaurant_id = r.id) AS "winesCount"
    FROM restaurants r
    LEFT JOIN languages dl ON dl.id = r.default_locale_id
    ${whereClause}
    ORDER BY r.name ASC
  `);

  return (result as any).rows as RestaurantListRow[];
}
