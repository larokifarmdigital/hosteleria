/**
 * Helpers de campos derivados. Se calculan al momento en el endpoint —
 * no se persisten en la BD.
 */
import { count, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { spaces, dishes, wines, restaurantLocales, languages } from '../db/schema/content';
import type { Env } from '../env';

/**
 * completePercent — % de campos "clave" rellenos en el restaurante.
 * Definimos campos mínimos que hacen la landing viable: nombre, dominio,
 * dirección con calle, contact.phone, al menos un espacio, al menos un
 * plato con precio.
 */
export function computeCompletePercent(input: {
  hasName: boolean;
  hasDomain: boolean;
  hasStreet: boolean;
  hasPhone: boolean;
  hasAnySpace: boolean;
  hasAnyDishWithPrice: boolean;
  hasSeoTitle: boolean;
  hasAllLocalesFilled: boolean; // hero en todos los locales activos
}): number {
  const checks = [
    input.hasName,
    input.hasDomain,
    input.hasStreet,
    input.hasPhone,
    input.hasAnySpace,
    input.hasAnyDishWithPrice,
    input.hasSeoTitle,
    input.hasAllLocalesFilled
  ];
  const ok = checks.filter(Boolean).length;
  return Math.round((ok / checks.length) * 100);
}

export async function countByRestaurant(env: Env, restaurantId: string) {
  const db = getDb(env.DATABASE_URL);

  // spaces
  const spacesRows = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.restaurantId, restaurantId));
  const spaceIds = spacesRows.map(s => s.id);

  if (spaceIds.length === 0) {
    return { spacesCount: 0, dishesCount: 0, winesCount: 0 };
  }

  // dishes + wines across all spaces of this restaurant
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

// Local import fix — drizzle-orm's inArray se necesita arriba.
import { inArray } from 'drizzle-orm';

/**
 * Devuelve los codes ISO de los idiomas activos de un restaurante.
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
