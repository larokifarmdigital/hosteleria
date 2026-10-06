import { eq, and, ne, asc, count } from 'drizzle-orm';
import { getDb } from './client.js';
import { spaces, spaceSchedule, restaurants } from './schema/content.js';
import type { Space, SpaceSnapshot, ScheduleDay } from '../../../domain/models/space.js';
import type { SpaceRepository } from '../../../domain/repositories/spaceRepository.js';
import type { Env } from '../../../env.js';
import { rowToSpace } from './mappers/spaceMapper.js';

export class DrizzleSpaceRepository implements SpaceRepository {
  constructor(private env: Env) {}

  private get db() { return getDb(this.env.DATABASE_URL); }

  /** Carga el schedule compuesto (una fila por turno → agrupamos por día). */
  private async loadSchedule(spaceId: string): Promise<ScheduleDay[]> {
    const rows = await this.db
      .select()
      .from(spaceSchedule)
      .where(eq(spaceSchedule.spaceId, spaceId))
      .orderBy(asc(spaceSchedule.day), asc(spaceSchedule.order));
    const byDay = new Map<string, ScheduleDay>();
    for (const r of rows) {
      if (!byDay.has(r.day)) byDay.set(r.day, { day: r.day, shifts: [] });
      byDay.get(r.day)!.shifts.push({ open: r.open, close: r.close });
    }
    return [...byDay.values()];
  }

  async findById(id: string): Promise<Space | null> {
    const row = await this.db.query.spaces.findFirst({ where: eq(spaces.id, id) });
    if (!row) return null;
    return rowToSpace({ ...row, schedule: await this.loadSchedule(id) });
  }

  async findByRestaurantAndSlug(restaurantId: string, slug: string): Promise<Space | null> {
    const row = await this.db.query.spaces.findFirst({
      where: and(eq(spaces.restaurantId, restaurantId), eq(spaces.slug, slug))
    });
    if (!row) return null;
    return rowToSpace({ ...row, schedule: await this.loadSchedule(row.id) });
  }

  async listByRestaurantSlug(slug: string): Promise<Space[]> {
    const r = await this.db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
    if (!r) return [];
    return this.listByRestaurantId(r.id);
  }

  async listByRestaurantId(restaurantId: string): Promise<Space[]> {
    const rows = await this.db.query.spaces.findMany({
      where: eq(spaces.restaurantId, restaurantId),
      orderBy: [asc(spaces.order)]
    });
    return Promise.all(rows.map(async row => rowToSpace({ ...row, schedule: await this.loadSchedule(row.id) })));
  }

  async countByRestaurant(restaurantId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(spaces).where(eq(spaces.restaurantId, restaurantId));
    return Number(row?.n ?? 0);
  }

  async create(input: {
    restaurantId: string;
    slug: string;
    name: string;
    type: Space['type'];
    descriptor: string;
    isDefault: boolean;
    order: number;
  }): Promise<Space> {
    const [row] = await this.db.insert(spaces).values({
      ...input,
      state: 'draft'
    }).returning();
    return rowToSpace({ ...row, schedule: [] });
  }

  async clearDefaultsExcept(restaurantId: string, keepId: string | null): Promise<void> {
    const where = keepId
      ? and(eq(spaces.restaurantId, restaurantId), ne(spaces.id, keepId))
      : eq(spaces.restaurantId, restaurantId);
    await this.db.update(spaces).set({ isDefault: false }).where(where);
  }

  async update(id: string, patch: Partial<Space>, actorId: string): Promise<void> {
    const updates: Partial<typeof spaces.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: actorId
    };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.type !== undefined) updates.type = patch.type;
    if (patch.descriptor !== undefined) updates.descriptor = patch.descriptor;
    if (patch.isDefault !== undefined) updates.isDefault = patch.isDefault;
    if (patch.order !== undefined) updates.order = patch.order;
    if (patch.coverGradient !== undefined) updates.coverGradient = patch.coverGradient;
    if (patch.state !== undefined) updates.state = patch.state;
    if (patch.hero !== undefined) updates.hero = patch.hero;
    if (patch.manifesto !== undefined) updates.manifesto = patch.manifesto;

    await this.db.update(spaces).set(updates).where(eq(spaces.id, id));
  }

  async replaceSchedule(spaceId: string, schedule: ScheduleDay[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(spaceSchedule).where(eq(spaceSchedule.spaceId, spaceId));
      const rows = schedule.flatMap(day =>
        day.shifts.map((s, i) => ({ spaceId, day: day.day, open: s.open, close: s.close, order: i }))
      );
      if (rows.length > 0) await tx.insert(spaceSchedule).values(rows);
    });
  }

  async saveSnapshot(id: string, snapshot: SpaceSnapshot): Promise<void> {
    await this.db.update(spaces).set({ publishedSnapshot: snapshot }).where(eq(spaces.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(spaces).where(eq(spaces.id, id));
  }
}
