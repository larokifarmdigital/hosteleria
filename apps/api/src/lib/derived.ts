import { count, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { spaces, dishes, wines, restaurantLocales, languages } from '../db/schema/content.js';
import type { Env } from '../env.js';

/**
 * Helpers de "campos derivados" — valores que la UI muestra pero que NO
 * están almacenados en la BD. Se calculan on-the-fly en el handler.
 */

/**
 * Porcentaje de completitud de un restaurante. La UI del backoffice lo
 * muestra como barra de progreso en el dashboard.
 *
 * Mide 8 campos "clave" para considerar que la landing es publicable:
 *   1. Tiene nombre
 *   2. Tiene dominio
 *   3. Tiene dirección (calle)
 *   4. Tiene teléfono
 *   5. Tiene al menos un espacio
 *   6. Tiene al menos un plato con precio
 *   7. Tiene título SEO
 *   8. Hero rellenado en todos los idiomas activos
 *
 * Dónde se usa:
 *  - `routes/restaurants.ts` → GET /restaurants (listado dashboard),
 *    GET /restaurants/:slug (detalle).
 */
export function computeCompletePercent(input: {
  hasName: boolean;
  hasDomain: boolean;
  hasStreet: boolean;
  hasPhone: boolean;
  hasAnySpace: boolean;
  hasAnyDishWithPrice: boolean;
  hasSeoTitle: boolean;
  hasAllLocalesFilled: boolean;
}): number {
  const checks = [
    input.hasName, input.hasDomain, input.hasStreet, input.hasPhone,
    input.hasAnySpace, input.hasAnyDishWithPrice, input.hasSeoTitle,
    input.hasAllLocalesFilled
  ];
  const ok = checks.filter(Boolean).length;
  return Math.round((ok / checks.length) * 100);
}

/**
 * Cuenta cuántos spaces, dishes y wines tiene un restaurante. La UI del
 * backoffice los muestra como "stats" en el dashboard.
 *
 * Dónde se usa:
 *  - `routes/restaurants.ts` → GET /restaurants/:slug (detalle). El
 *    listado agregado (/restaurants) usa `restaurant-list.ts` que
 *    optimiza con 1 sola query en vez de 3.
 */
export async function countByRestaurant(env: Env, restaurantId: string) {
  const db = getDb(env.DATABASE_URL);

  const spacesRows = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.restaurantId, restaurantId));
  const spaceIds = spacesRows.map(s => s.id);

  if (spaceIds.length === 0) {
    return { spacesCount: 0, dishesCount: 0, winesCount: 0 };
  }

  const [dishesAgg] = await db
    .select({ n: count() })
    .from(dishes)
    .where(inArray(dishes.spaceId, spaceIds));
  const [winesAgg] = await db
    .select({ n: count() })
    .from(wines)
    .where(inArray(wines.spaceId, spaceIds));

  return {
    spacesCount: spaceIds.length,
    dishesCount: Number(dishesAgg?.n ?? 0),
    winesCount: Number(winesAgg?.n ?? 0)
  };
}

/**
 * Devuelve los codes ISO (ej. ['es', 'ca', 'en']) de los idiomas activos
 * de un restaurante. Se usa para serializar `activeLocales` en el DTO y
 * para calcular `localesFilled` por campo.
 *
 * Dónde se usa:
 *  - `routes/restaurants.ts` → GET /restaurants/:slug.
 */
export async function getActiveLocaleCodes(env: Env, restaurantId: string): Promise<string[]> {
  const db = getDb(env.DATABASE_URL);
  const rows = await db
    .select({ code: languages.code })
    .from(restaurantLocales)
    .innerJoin(languages, eq(languages.id, restaurantLocales.languageId))
    .where(eq(restaurantLocales.restaurantId, restaurantId));
  return rows.map(r => r.code);
}
