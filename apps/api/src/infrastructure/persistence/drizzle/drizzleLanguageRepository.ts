import { eq, count, inArray } from 'drizzle-orm';
import { getDb } from './client.js';
import { languages, restaurantLocales } from './schema/content.js';
import type { Language } from '../../../domain/models/language.js';
import { LanguageNotFoundError } from '../../../domain/models/language.js';
import type { LanguageRepository } from '../../../domain/repositories/languageRepository.js';
import type { Env } from '../../../env.js';
import { rowToLanguage } from './mappers/languageMapper.js';

/**
 * Impl Drizzle del `LanguageRepository`.
 */
export class DrizzleLanguageRepository implements LanguageRepository {
  constructor(private env: Env) {}

  private get db() { return getDb(this.env.DATABASE_URL); }

  async list(): Promise<Language[]> {
    const rows = await this.db.query.languages.findMany();
    return rows.map(rowToLanguage);
  }

  async findByCode(code: string): Promise<Language | null> {
    const row = await this.db.query.languages.findFirst({ where: eq(languages.code, code) });
    return row ? rowToLanguage(row) : null;
  }

  async findById(id: string): Promise<Language | null> {
    const row = await this.db.query.languages.findFirst({ where: eq(languages.id, id) });
    return row ? rowToLanguage(row) : null;
  }

  async resolveCodes(codes: string[]): Promise<string[]> {
    if (codes.length === 0) return [];
    const rows = await this.db.query.languages.findMany({ where: inArray(languages.code, codes) });
    const map = new Map(rows.map(r => [r.code, r.id]));
    return codes.map(c => {
      const id = map.get(c);
      if (!id) throw new LanguageNotFoundError(c);
      return id;
    });
  }

  async countUsage(languageId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(restaurantLocales)
      .where(eq(restaurantLocales.languageId, languageId));
    return Number(row?.n ?? 0);
  }

  async create(input: { code: string; name: string }): Promise<Language> {
    const [row] = await this.db.insert(languages).values(input).returning();
    return rowToLanguage(row);
  }

  async update(id: string, patch: { name?: string }): Promise<void> {
    await this.db.update(languages).set(patch).where(eq(languages.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(languages).where(eq(languages.id, id));
  }
}
