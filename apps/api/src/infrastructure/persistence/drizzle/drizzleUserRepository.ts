import { eq, inArray, asc } from 'drizzle-orm';
import { getDb } from './client.js';
import { users, userRestaurants } from './schema/auth.js';
import { restaurants } from './schema/content.js';
import type { User, UserRole } from '../../../domain/models/user.js';
import type { UserRepository } from '../../../domain/repositories/userRepository.js';
import type { Env } from '../../../env.js';
import { rowToUser } from './mappers/userMapper.js';

export class DrizzleUserRepository implements UserRepository {
  constructor(private env: Env) {}

  private get db() { return getDb(this.env.DATABASE_URL); }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
    return row ? rowToUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: eq(users.id, id) });
    return row ? rowToUser(row) : null;
  }

  async list(): Promise<User[]> {
    const rows = await this.db.query.users.findMany({ orderBy: [asc(users.name)] });
    return rows.map(rowToUser);
  }

  async create(input: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    avatarColor: string;
  }): Promise<User> {
    const [row] = await this.db.insert(users).values({
      ...input,
      email: input.email.toLowerCase()
    }).returning();
    return rowToUser(row);
  }

  async update(id: string, patch: Partial<Pick<User, 'name' | 'role' | 'avatarColor'>>): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await this.db.update(users).set(patch).where(eq(users.id, id));
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async touchLastAccess(id: string): Promise<void> {
    try {
      await this.db.update(users).set({ lastAccessAt: new Date() }).where(eq(users.id, id));
    } catch { /* best-effort */ }
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async setRestaurants(userId: string, restaurantIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(userRestaurants).where(eq(userRestaurants.userId, userId));
      if (restaurantIds.length > 0) {
        await tx.insert(userRestaurants).values(
          restaurantIds.map(restaurantId => ({ userId, restaurantId }))
        );
      }
    });
  }

  async listRestaurantIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: userRestaurants.restaurantId })
      .from(userRestaurants)
      .where(eq(userRestaurants.userId, userId));
    return rows.map(r => r.id);
  }
}
