import { eq } from 'drizzle-orm';
import { getDb, type Env } from '@/core/shared';
import { publishedSites } from '@/core/shared/infrastructure/drizzle/schema';
import { reviveSiteCopy, type SiteCopy } from '../domain/models/siteCopy';
import type { PublishedSiteRepository, StoredSiteCopy } from '../domain/repositories/publishedSiteRepository';

export class DrizzlePublishedSiteRepository implements PublishedSiteRepository {
  constructor(private env: Env) {}
  private get db() { return getDb(this.env.DATABASE_URL); }

  async find(restaurantId: string): Promise<StoredSiteCopy | null> {
    const [row] = await this.db.select().from(publishedSites).where(eq(publishedSites.restaurantId, restaurantId)).limit(1);
    return row ? { copy: reviveSiteCopy(row.sources), publishedAt: row.publishedAt } : null;
  }

  async save(restaurantId: string, copy: SiteCopy, actorId: string | null): Promise<void> {
    const values = { sources: JSON.parse(JSON.stringify(copy)), publishedAt: new Date(), publishedBy: actorId };
    await this.db.insert(publishedSites).values({ restaurantId, ...values })
      .onConflictDoUpdate({ target: publishedSites.restaurantId, set: values });
  }

  async listMediaIds(): Promise<string[]> {
    const rows = await this.db.select({ sources: publishedSites.sources }).from(publishedSites);
    const ids = new Set<string>();
    for (const row of rows) for (const m of (row.sources as { media?: { id: string }[] }).media ?? []) ids.add(m.id);
    return [...ids];
  }
}
