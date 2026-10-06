import { sql, eq } from 'drizzle-orm';
import { getDb } from './client.js';
import { restaurants, restaurantLocales } from './schema/content.js';
import type { Restaurant, RestaurantSnapshot } from '../../../domain/models/restaurant.js';
import { SlugTakenError } from '../../../domain/models/restaurant.js';
import type { RestaurantRepository } from '../../../domain/repositories/restaurantRepository.js';
import type { Env } from '../../../env.js';
import { rowToRestaurant, type RestaurantRow } from './mappers/restaurantMapper.js';

/**
 * Impl Drizzle del `RestaurantRepository`.
 *
 * El listado y detalle usan UNA SQL con JOIN + array_agg + subqueries de
 * COUNT para traer locales + spacesCount/dishesCount/winesCount en una sola
 * query (evita N+1). El SELECT devuelve directamente el shape `RestaurantRow`
 * que el mapper usa.
 */
export class DrizzleRestaurantRepository implements RestaurantRepository {
  constructor(private env: Env) {}

  private get db() { return getDb(this.env.DATABASE_URL); }

  /** SQL compartido por `findBySlug`, `findById` y `listAccessibleBy`. */
  private buildSelectQuery(whereClause: ReturnType<typeof sql> = sql``) {
    return sql`
      SELECT
        r.id, r.slug, r.name, r.domain,
        r.logo_initial AS "logoInitial",
        r.cover_gradient AS "coverGradient",
        r.state, r.timezone,
        r.rebuild_hook_url AS "rebuildHookUrl",
        r.accepts_bookings AS "acceptsBookings",
        r.show_socials AS "showSocials",
        r.address, r.contact, r.socials, r.seo,
        r.last_published_at AS "lastPublishedAt",
        r.published_snapshot AS "publishedSnapshot",
        dl.code AS "defaultLocaleCode",
        COALESCE(
          (SELECT array_agg(l.code ORDER BY l.code)
           FROM restaurant_locales rl
           JOIN languages l ON l.id = rl.language_id
           WHERE rl.restaurant_id = r.id),
          ARRAY[]::text[]
        ) AS "activeLocaleCodes",
        (SELECT COUNT(*)::int FROM spaces s WHERE s.restaurant_id = r.id) AS "spacesCount",
        (SELECT COUNT(*)::int FROM dishes d JOIN spaces s ON s.id = d.space_id WHERE s.restaurant_id = r.id) AS "dishesCount",
        (SELECT COUNT(*)::int FROM wines w JOIN spaces s ON s.id = w.space_id WHERE s.restaurant_id = r.id) AS "winesCount"
      FROM restaurants r
      LEFT JOIN languages dl ON dl.id = r.default_locale_id
      ${whereClause}
      ORDER BY r.name ASC
    `;
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const result = await this.db.execute(this.buildSelectQuery(sql`WHERE r.slug = ${slug}`));
    const row = (result as any).rows[0] as RestaurantRow | undefined;
    return row ? rowToRestaurant(row) : null;
  }

  async findById(id: string): Promise<Restaurant | null> {
    const result = await this.db.execute(this.buildSelectQuery(sql`WHERE r.id = ${id}`));
    const row = (result as any).rows[0] as RestaurantRow | undefined;
    return row ? rowToRestaurant(row) : null;
  }

  async listAccessibleBy(allowedIds: string[] | null): Promise<Restaurant[]> {
    if (allowedIds?.length === 0) return [];
    const where = allowedIds ? sql`WHERE r.id = ANY(${allowedIds})` : sql``;
    const result = await this.db.execute(this.buildSelectQuery(where));
    return ((result as any).rows as RestaurantRow[]).map(rowToRestaurant);
  }

  async createWithLocales(input: {
    slug: string;
    name: string;
    domain: string;
    logoInitial: string;
    defaultLocaleId: string;
    activeLocaleIds: string[];
  }): Promise<Restaurant> {
    // Pre-check: slug único.
    const existing = await this.db.query.restaurants.findFirst({ where: eq(restaurants.slug, input.slug) });
    if (existing) throw new SlugTakenError(input.slug);

    const activeIds = input.activeLocaleIds.includes(input.defaultLocaleId)
      ? input.activeLocaleIds
      : [...input.activeLocaleIds, input.defaultLocaleId];

    const { slug } = await this.db.transaction(async (tx) => {
      const [row] = await tx.insert(restaurants).values({
        slug: input.slug,
        name: input.name,
        domain: input.domain,
        logoInitial: input.logoInitial || input.name.charAt(0).toUpperCase(),
        defaultLocaleId: input.defaultLocaleId,
        state: 'draft'
      }).returning({ id: restaurants.id, slug: restaurants.slug });

      await tx.insert(restaurantLocales).values(
        activeIds.map(languageId => ({ restaurantId: row.id, languageId }))
      );
      return row;
    });

    return (await this.findBySlug(slug))!;
  }

  async update(id: string, patch: Partial<Restaurant>, actorId: string): Promise<void> {
    const updates: Partial<typeof restaurants.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: actorId
    };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.domain !== undefined) updates.domain = patch.domain;
    if (patch.logoInitial !== undefined) updates.logoInitial = patch.logoInitial;
    if (patch.coverGradient !== undefined) updates.coverGradient = patch.coverGradient;
    if (patch.state !== undefined) updates.state = patch.state;
    if (patch.acceptsBookings !== undefined) updates.acceptsBookings = patch.acceptsBookings;
    if (patch.showSocials !== undefined) updates.showSocials = patch.showSocials;
    if (patch.timezone !== undefined) updates.timezone = patch.timezone;
    if (patch.rebuildHookUrl !== undefined) updates.rebuildHookUrl = patch.rebuildHookUrl;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.contact !== undefined) updates.contact = patch.contact;
    if (patch.socials !== undefined) updates.socials = patch.socials;
    if (patch.seo !== undefined) updates.seo = patch.seo;
    if (patch.lastPublishedAt !== undefined) updates.lastPublishedAt = patch.lastPublishedAt;

    await this.db.update(restaurants).set(updates).where(eq(restaurants.id, id));
  }

  async replaceLocales(id: string, languageIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(restaurantLocales).where(eq(restaurantLocales.restaurantId, id));
      if (languageIds.length > 0) {
        await tx.insert(restaurantLocales).values(
          languageIds.map(languageId => ({ restaurantId: id, languageId }))
        );
      }
    });
  }

  async saveSnapshot(id: string, snapshot: RestaurantSnapshot, publishedAt: Date): Promise<void> {
    await this.db.update(restaurants).set({
      publishedSnapshot: snapshot,
      lastPublishedAt: publishedAt
    }).where(eq(restaurants.id, id));
  }

  async deleteBySlug(slug: string): Promise<void> {
    await this.db.delete(restaurants).where(eq(restaurants.slug, slug));
  }
}
