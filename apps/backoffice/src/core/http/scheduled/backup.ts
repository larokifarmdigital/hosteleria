import { getDb, type Env } from '@/core/shared';
import * as schema from '@/core/shared/infrastructure/drizzle/schema';

// Dump a R2 además de los snapshots de Neon: otro proveedor, por si el
// incidente es de Neon. Sin `passwordHash`: si el backup se filtra no hay
// credenciales; en un recovery los passwords se re-setean por email.

const BACKUP_PREFIX = 'backups/';
const RETENTION_DAYS = 30;

export interface BackupResult {
  key: string;
  sizeKb: number;
  tables: Record<string, number>;
  purged: number;
}

export async function runBackup(env: Env): Promise<BackupResult> {
  const db = getDb(env.DATABASE_URL);

  const [
    languages, restaurants, restaurantLocales, spaces, spaceSchedule,
    dishCategories, dishes, wineCategories, wines, mediaAssets,
    users, userRestaurants
  ] = await Promise.all([
    db.select().from(schema.languages),
    db.select().from(schema.restaurants),
    db.select().from(schema.restaurantLocales),
    db.select().from(schema.spaces),
    db.select().from(schema.spaceSchedule),
    db.select().from(schema.dishCategories),
    db.select().from(schema.dishes),
    db.select().from(schema.wineCategories),
    db.select().from(schema.wines),
    db.select().from(schema.mediaAssets),
    // Select explícito: sin passwordHash.
    db.select({
      id: schema.users.id, email: schema.users.email, name: schema.users.name,
      role: schema.users.role, avatarColor: schema.users.avatarColor,
      createdAt: schema.users.createdAt, lastAccessAt: schema.users.lastAccessAt
    }).from(schema.users),
    db.select().from(schema.userRestaurants)
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1',
    tables: {
      languages, restaurants, restaurant_locales: restaurantLocales,
      spaces, space_schedule: spaceSchedule,
      dish_categories: dishCategories, dishes,
      wine_categories: wineCategories, wines,
      media_assets: mediaAssets,
      users, user_restaurants: userRestaurants
    }
  };

  const json = JSON.stringify(payload);
  const dateStr = new Date().toISOString().slice(0, 10);
  const key = `${BACKUP_PREFIX}${dateStr}.json`;

  await env.MEDIA.put(key, json, {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: {
      'exported-at': payload.exportedAt,
      'row-count': String(Object.values(payload.tables).reduce((n, t) => n + t.length, 0))
    }
  });

  const list = await env.MEDIA.list({ prefix: BACKUP_PREFIX });
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const obj of list.objects) {
    if (obj.uploaded.getTime() < cutoff) {
      await env.MEDIA.delete(obj.key);
      purged++;
    }
  }

  return {
    key,
    sizeKb: Math.round(json.length / 1024),
    tables: Object.fromEntries(Object.entries(payload.tables).map(([t, rows]) => [t, rows.length])),
    purged
  };
}
