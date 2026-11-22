import { and, eq } from 'drizzle-orm';
import { getDb, type I18nValue, type Env } from '@/core/shared';
import { legalPages } from '@/core/shared/infrastructure/drizzle/schema';
import { LEGAL_PAGE_TYPES, type LegalPage, type LegalPageType } from '../domain/models/legalPage';
import type { LegalPageRepository } from '../domain/repositories/legalPageRepository';

function rowToLegalPage(row: typeof legalPages.$inferSelect): LegalPage {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    type: row.type as LegalPageType,
    title: (row.title as I18nValue) ?? {},
    content: (row.content as I18nValue) ?? {},
    lastUpdated: row.lastUpdated ?? null,
    updatedAt: row.updatedAt
  };
}

export class DrizzleLegalPageRepository implements LegalPageRepository {
  constructor(private env: Env) {}
  private get db() { return getDb(this.env.DATABASE_URL); }

  async listByRestaurantId(restaurantId: string): Promise<LegalPage[]> {
    const rows = await this.db.select().from(legalPages).where(eq(legalPages.restaurantId, restaurantId));
    return rows
      .map(rowToLegalPage)
      .sort((a, b) => LEGAL_PAGE_TYPES.indexOf(a.type) - LEGAL_PAGE_TYPES.indexOf(b.type));
  }

  async upsert(
    restaurantId: string,
    type: LegalPageType,
    data: Pick<LegalPage, 'title' | 'content' | 'lastUpdated'>,
    actorId: string
  ): Promise<LegalPage> {
    const values = { ...data, updatedAt: new Date(), updatedBy: actorId };
    const [row] = await this.db
      .insert(legalPages)
      .values({ restaurantId, type, ...values })
      .onConflictDoUpdate({ target: [legalPages.restaurantId, legalPages.type], set: values })
      .returning();
    return rowToLegalPage(row);
  }

  async delete(restaurantId: string, type: LegalPageType): Promise<void> {
    await this.db.delete(legalPages).where(and(eq(legalPages.restaurantId, restaurantId), eq(legalPages.type, type)));
  }
}
