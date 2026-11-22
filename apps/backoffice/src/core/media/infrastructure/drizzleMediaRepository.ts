import { eq, and, desc, sql, isNull, isNotNull, lt, inArray } from 'drizzle-orm';
import { getDb } from './client.js';
import { mediaAssets } from './schema/media.js';
import { dishes, restaurants } from './schema/content.js';
import type { MediaAsset, MediaReference, MediaUsage } from '../../../domain/models/media.js';
import { restaurantMediaUses, type RestaurantContent, type RestaurantSnapshot } from '../../../domain/models/restaurant.js';
import type { I18nValue } from '../../../domain/models/i18n.js';
import type { MediaRepository } from '../../../domain/repositories/mediaRepository.js';
import type { Env } from '../../../env.js';
import { rowToMedia } from './mappers/mediaMapper.js';

export class DrizzleMediaRepository implements MediaRepository {
  constructor(private env: Env) {}
  private get db() { return getDb(this.env.DATABASE_URL); }

  async findById(id: string): Promise<MediaAsset | null> {
    const row = await this.db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
    return row ? rowToMedia(row) : null;
  }

  async findByIds(ids: string[]): Promise<MediaAsset[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.query.mediaAssets.findMany({ where: inArray(mediaAssets.id, ids) });
    return rows.map(rowToMedia);
  }

  async list(filters?: {
    restaurantSlug?: string;
    usage?: MediaUsage;
    missingAlt?: boolean;
  }): Promise<MediaAsset[]> {
    const conds = [isNotNull(mediaAssets.confirmedAt)];
    if (filters?.restaurantSlug) {
      const r = await this.db.query.restaurants.findFirst({
        where: eq(restaurants.slug, filters.restaurantSlug)
      });
      if (!r) return [];
      conds.push(eq(mediaAssets.restaurantId, r.id));
    }
    if (filters?.usage) conds.push(eq(mediaAssets.usage, filters.usage));
    if (filters?.missingAlt) conds.push(eq(mediaAssets.hasAltText, false));

    const rows = await this.db.query.mediaAssets.findMany({
      where: and(...conds),
      orderBy: [desc(mediaAssets.createdAt)]
    });
    return rows.map(rowToMedia);
  }

  async createPending(input: {
    restaurantId: string;
    name: string;
    sizeKb: number;
    mimeType: string;
    r2Key: string;
    uploadedBy: string | null;
  }): Promise<MediaAsset> {
    const [row] = await this.db.insert(mediaAssets).values({
      ...input,
      usage: 'unused',
      hasAltText: false
    }).returning();
    return rowToMedia(row);
  }

  async confirmUpload(id: string, patch: {
    width?: number;
    height?: number;
    altText?: I18nValue;
  }): Promise<MediaAsset> {
    const updates: Partial<typeof mediaAssets.$inferInsert> = { confirmedAt: new Date() };
    if (patch.width !== undefined) updates.width = patch.width;
    if (patch.height !== undefined) updates.height = patch.height;
    if (patch.altText !== undefined) {
      updates.altText = patch.altText;
      updates.hasAltText = Object.values(patch.altText).some(v => v && v.length > 0);
    }
    const [row] = await this.db.update(mediaAssets).set(updates).where(eq(mediaAssets.id, id)).returning();
    return rowToMedia(row);
  }

  async update(id: string, patch: Partial<Pick<MediaAsset, 'usage' | 'hasAltText' | 'altText'>>): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await this.db.update(mediaAssets).set(patch).where(eq(mediaAssets.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }

  async listUnconfirmedBefore(before: Date): Promise<MediaAsset[]> {
    const rows = await this.db.query.mediaAssets.findMany({
      where: and(isNull(mediaAssets.confirmedAt), lt(mediaAssets.createdAt, before))
    });
    return rows.map(rowToMedia);
  }

  /**
   * `dishes.imageAssetId` es FK normal; `spaces.hero` guarda la referencia
   * dentro del jsonb — ahí hace falta `->>` para extraerla. `gallery` queda
   * reservado para cuando añadamos tabla de galerías.
   *
   * También cuenta la portada publicada: una foto ya sustituida en el
   * borrador sigue en la web hasta que se publique el cambio.
   */
  async findReferences(id: string): Promise<MediaReference[]> {
    const [dishRows, spaceRows, restaurantRows] = await Promise.all([
      this.db.select({ id: dishes.id }).from(dishes).where(eq(dishes.imageAssetId, id)),
      this.db.execute(sql`
        SELECT s.id,
          (s.hero ->> 'imageAssetId' = ${id}
            OR s.published_snapshot -> 'hero' ->> 'imageAssetId' = ${id}) AS "inHero",
          (COALESCE(s.gallery, '[]'::jsonb) @> ${JSON.stringify([id])}::jsonb
            OR COALESCE(s.published_snapshot -> 'gallery', '[]'::jsonb) @> ${JSON.stringify([id])}::jsonb) AS "inGallery"
        FROM spaces s
      `),
      // Una imagen solo se puede asignar a contenido de su restaurante, así que
      // basta con mirar el suyo.
      this.db
        .select({
          id: restaurants.id,
          branding: restaurants.branding,
          seo: restaurants.seo,
          about: restaurants.about,
          groups: restaurants.groups,
          homeBlocks: restaurants.homeBlocks,
          publishedSnapshot: restaurants.publishedSnapshot
        })
        .from(restaurants)
        .innerJoin(mediaAssets, eq(mediaAssets.restaurantId, restaurants.id))
        .where(eq(mediaAssets.id, id))
    ]);
    const refs: MediaReference[] = [];
    for (const d of dishRows) refs.push({ kind: 'dish', refId: d.id });
    for (const s of ((spaceRows as any).rows ?? []) as { id: string; inHero: boolean | null; inGallery: boolean | null }[]) {
      if (s.inHero) refs.push({ kind: 'hero', refId: s.id });
      if (s.inGallery) refs.push({ kind: 'gallery', refId: s.id });
    }
    for (const r of restaurantRows) {
      const uses = new Set(
        [...restaurantMediaUses(r as Partial<RestaurantContent>), ...restaurantMediaUses(r.publishedSnapshot as RestaurantSnapshot | null)]
          .filter(u => u.assetId === id)
          .map(u => u.use)
      );
      for (const use of uses) refs.push({ kind: 'restaurant', refId: r.id, use });
    }
    return refs;
  }
}
