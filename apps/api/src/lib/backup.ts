import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3 } from './r2.js';
import { getDb } from '../db/client.js';
import * as schema from '../db/schema/index.js';
import type { Env } from '../env.js';

/**
 * Backups off-provider — exporta todas las tablas de Neon a JSON y
 * sube el fichero al bucket R2 bajo `backups/YYYY-MM-DD.json`.
 *
 * Razón: Neon ya hace snapshots internos, pero están dentro del propio
 * proveedor. Si Neon tuviese un incidente serio, perderíamos datos.
 * Un dump en R2 (otro proveedor) protege contra ese escenario.
 *
 * Formato: JSON Lines (NDJSON) con cada tabla etiquetada. Más fácil de
 * leer que SQL dump y portable a cualquier Postgres.
 *
 * Retención: borra backups con fecha > 30 días del bucket.
 */

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

  // Snapshot de cada tabla — sin filtros, todo.
  const [
    languagesData,
    restaurantsData,
    restaurantLocalesData,
    spacesData,
    spaceScheduleData,
    dishCategoriesData,
    dishesData,
    wineCategoriesData,
    winesData,
    mediaAssetsData,
    usersData,
    userRestaurantsData
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
    db.select({
      id: schema.users.id, email: schema.users.email, name: schema.users.name,
      role: schema.users.role, avatarColor: schema.users.avatarColor,
      createdAt: schema.users.createdAt, lastAccessAt: schema.users.lastAccessAt
      // ⚠ No incluir passwordHash en backups — reduce blast radius si el
      // backup se filtra. Para recovery completo re-setea passwords via email.
    }).from(schema.users),
    db.select().from(schema.userRestaurants)
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1',
    tables: {
      languages: languagesData,
      restaurants: restaurantsData,
      restaurant_locales: restaurantLocalesData,
      spaces: spacesData,
      space_schedule: spaceScheduleData,
      dish_categories: dishCategoriesData,
      dishes: dishesData,
      wine_categories: wineCategoriesData,
      wines: winesData,
      media_assets: mediaAssetsData,
      users: usersData,
      user_restaurants: userRestaurantsData
    }
  };

  const json = JSON.stringify(payload);
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `${BACKUP_PREFIX}${dateStr}.json`;
  const s3 = getS3(env);

  await s3.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    Body: json,
    ContentType: 'application/json',
    Metadata: {
      'exported-at': payload.exportedAt,
      'row-count': String(Object.values(payload.tables).reduce((n, t) => n + t.length, 0))
    }
  }));

  // Retención: borra backups > RETENTION_DAYS.
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: env.R2_BUCKET,
    Prefix: BACKUP_PREFIX
  }));
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const obj of list.Contents ?? []) {
    if (!obj.Key || !obj.LastModified) continue;
    if (obj.LastModified.getTime() < cutoff) {
      await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: obj.Key }));
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
