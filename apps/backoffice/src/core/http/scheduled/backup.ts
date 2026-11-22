import { getDb, getEnv } from '@/core/shared';
import { R2Client } from '@/core/media';
import * as schema from '@/core/shared/infrastructure/drizzle/schema';

// Dump a R2 además de los snapshots de Neon: otro proveedor, por si el
// incidente es de Neon. Sin `passwordHash` ni el deploy hook: si la copia se
// filtra no hay credenciales; en un recovery los passwords se re-setean por email.
//
// Va a un bucket PRIVADO aparte (`R2_BACKUP_BUCKET`). El de las fotos se sirve
// en público entero: una copia ahí se descarga sin sesión con solo adivinar la fecha.

const BACKUP_PREFIX = 'backups/';
const RETENTION_DAYS = 30;

export interface BackupResult {
  key: string;
  sizeKb: number;
  tables: Record<string, number>;
  purged: number;
}

export interface BackupDump {
  json: string;
  exportedAt: string;
  tables: Record<string, number>;
}

/** La parte que solo lee: sirve también para medir la copia sin escribir en R2. */
export async function buildBackupDump(): Promise<BackupDump> {
  const db = getDb(getEnv().DATABASE_URL);

  const [
    languages, restaurants, restaurantLocales, spaces, spaceSchedule,
    dishCategories, dishes, wineCategories, wines, mediaAssets,
    users, userRestaurants, legalPages
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
      createdAt: schema.users.createdAt, lastAccessAt: schema.users.lastAccessAt,
      // Sin él, restaurar la copia reactivaría las cuentas suspendidas.
      suspendedAt: schema.users.suspendedAt
    }).from(schema.users),
    db.select().from(schema.userRestaurants),
    db.select().from(schema.legalPages)
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1',
    tables: {
      languages,
      // El deploy hook es una credencial: con él se lanzan builds.
      restaurants: restaurants.map(({ rebuildHookUrl: _hook, ...rest }) => rest),
      restaurant_locales: restaurantLocales,
      spaces, space_schedule: spaceSchedule,
      dish_categories: dishCategories, dishes,
      wine_categories: wineCategories, wines,
      media_assets: mediaAssets,
      users, user_restaurants: userRestaurants,
      legal_pages: legalPages
    }
  };

  return {
    json: JSON.stringify(payload),
    exportedAt: payload.exportedAt,
    tables: Object.fromEntries(Object.entries(payload.tables).map(([t, rows]) => [t, rows.length]))
  };
}

export async function runBackup(): Promise<BackupResult> {
  const env = getEnv();
  if (!env.R2_BACKUP_BUCKET) throw new Error('BACKUP_BUCKET_MISSING: define R2_BACKUP_BUCKET con un bucket privado');
  if (env.R2_BACKUP_BUCKET === env.R2_BUCKET) throw new Error('BACKUP_BUCKET_PUBLIC: R2_BACKUP_BUCKET no puede ser el bucket de las fotos');
  const r2 = new R2Client({ ...env, R2_BUCKET: env.R2_BACKUP_BUCKET });
  const dump = await buildBackupDump();
  const key = `${BACKUP_PREFIX}${dump.exportedAt.slice(0, 10)}.json`;

  await r2.put(key, dump.json, {
    contentType: 'application/json',
    metadata: {
      'exported-at': dump.exportedAt,
      'row-count': String(Object.values(dump.tables).reduce((n, rows) => n + rows, 0))
    }
  });

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const object of await r2.list(BACKUP_PREFIX)) {
    if (object.uploadedAt.getTime() < cutoff) {
      await r2.delete(object.key);
      purged++;
    }
  }

  return { key, sizeKb: Math.round(dump.json.length / 1024), tables: dump.tables, purged };
}
