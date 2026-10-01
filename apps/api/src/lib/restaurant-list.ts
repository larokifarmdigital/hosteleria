import { sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import type { Env } from '../env';

/**
 * Lista de restaurantes con todos los campos derivados en UNA sola query.
 *
 * Antes: `toDto()` en bucle llamaba a:
 *   - getActiveLocaleCodes()   → 1 query por restaurante
 *   - countByRestaurant()      → 3 queries (spaces, dishes, wines)
 * Total: 4N queries para N restaurantes (24 queries con los 6 actuales,
 * 240 con 60).
 *
 * Ahora: 1 query con LEFT JOIN + array_agg para locales + subqueries para
 * counters. Independiente del número de restaurantes.
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

export async function listRestaurantsAggregated(
  env: Env,
  opts: { allowedIds?: string[] } = {}
): Promise<RestaurantListRow[]> {
  const db = getDb(env.DATABASE_URL);

  // Si allowedIds es un array vacío, el user editor no tiene acceso a ninguno.
  if (opts.allowedIds?.length === 0) return [];

  // Construimos el WHERE opcional con placeholder-safe parametrization.
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

  // `pg` devuelve `rows` ya tipados como Record<string, any>[].
  return (result as any).rows as RestaurantListRow[];
}
