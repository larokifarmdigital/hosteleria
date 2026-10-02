import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, and, asc, count, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getDb } from '../db/client.js';
import { mediaAssets } from '../db/schema/media.js';
import { restaurants, spaces, dishes } from '../db/schema/content.js';
import { sql } from 'drizzle-orm';
import { userRestaurants } from '../db/schema/auth.js';
import { requireAuth, type AuthVars } from '../auth/middleware.js';
import { createUploadUrl, deleteObject, normalizeFilename, headObject } from '../lib/r2.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_SIZE_KB = 10_000; // 10 MB

const uploadUrlSchema = z.object({
  restaurantSlug: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().refine(m => ALLOWED_MIME.includes(m), 'mimetype no permitido'),
  sizeKb: z.number().int().positive().max(MAX_SIZE_KB)
});

const confirmSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  altText: z.record(z.string()).optional()
});

const patchSchema = z.object({
  usage: z.enum(['hero', 'gallery', 'dish', 'unused']).optional(),
  hasAltText: z.boolean().optional(),
  altText: z.record(z.string()).optional()
}).partial();

async function assertRestaurantAccess(c: any, slug: string): Promise<string> {
  const env = c.get('env');
  const user = c.get('user')!;
  const db = getDb(env.DATABASE_URL);
  const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
  if (!r) throw new HTTPException(404, { message: 'restaurant_not_found' });
  if (user.role === 'admin') return r.id;
  const [{ n }] = await db
    .select({ n: count() })
    .from(userRestaurants)
    .where(and(eq(userRestaurants.userId, user.id), eq(userRestaurants.restaurantId, r.id)));
  if (Number(n) === 0) throw new HTTPException(403, { message: 'restaurant_forbidden' });
  return r.id;
}

async function allowedRestaurantIds(c: any): Promise<Set<string> | null> {
  const env = c.get('env');
  const user = c.get('user')!;
  const db = getDb(env.DATABASE_URL);
  if (user.role === 'admin') return null;
  const rows = await db
    .select({ id: userRestaurants.restaurantId })
    .from(userRestaurants)
    .where(eq(userRestaurants.userId, user.id));
  return new Set(rows.map(r => r.id));
}

async function toDto(env: any, id: string) {
  const db = getDb(env.DATABASE_URL);
  const m = await db.query.mediaAssets.findFirst({
    where: eq(mediaAssets.id, id),
    with: { restaurant: true }
  });
  if (!m) return null;
  return {
    id: m.id,
    name: m.name,
    r2Key: m.r2Key,
    publicUrl: `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${m.r2Key}`,
    mimeType: m.mimeType,
    sizeKb: m.sizeKb,
    width: m.width,
    height: m.height,
    usage: m.usage,
    hasAltText: m.hasAltText,
    altText: m.altText ?? {},
    restaurantSlug: m.restaurant?.slug ?? null,
    restaurantName: m.restaurant?.name ?? null,
    uploadedBy: m.uploadedBy,
    createdAt: m.createdAt.toISOString()
  };
}

export function createMediaRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();
  app.use('*', requireAuth);

  // ─── POST /media/upload-url ────────────────────────────────────
  // Genera una PUT URL R2 firmada + reserva un mediaId en la BD.
  app.post('/upload-url', zValidator('json', uploadUrlSchema), async (c) => {
    const env = c.get('env');
    const user = c.get('user')!;
    const body = c.req.valid('json');
    const restaurantId = await assertRestaurantAccess(c, body.restaurantSlug);
    const db = getDb(env.DATABASE_URL);

    const { name, extension } = normalizeFilename(body.filename);
    const year = new Date().getFullYear();
    const shortId = createId().slice(0, 8);
    const r2Key = `${body.restaurantSlug}/${year}/${name}-${shortId}.${extension}`;

    // Reservamos el asset en la BD como 'unused' — se confirma luego.
    const [row] = await db.insert(mediaAssets).values({
      name: `${name}.${extension}`,
      r2Key,
      mimeType: body.mimeType,
      sizeKb: body.sizeKb,
      restaurantId,
      uploadedBy: user.id,
      usage: 'unused',
      hasAltText: false
    }).returning({ id: mediaAssets.id });

    const { uploadUrl, publicUrl, expiresIn } = await createUploadUrl({
      env, key: r2Key, contentType: body.mimeType, expiresIn: 300
    });

    return c.json({ mediaId: row.id, uploadUrl, publicUrl, r2Key, expiresIn });
  });

  // ─── POST /media/:id/confirm ───────────────────────────────────
  // El browser confirma tras el PUT — actualizamos dimensions/alt.
  app.post('/:id/confirm', zValidator('json', confirmSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);

    const m = await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
    if (!m) throw new HTTPException(404, { message: 'not_found' });
    if (m.restaurantId) await assertRestaurantAccess(c, (await db.query.restaurants.findFirst({ where: eq(restaurants.id, m.restaurantId) }))!.slug);

    // Verificación crítica: el browser dice que subió, pero no confiamos.
    // Preguntamos a R2 "¿existe realmente el objeto?". Si no → 400 y
    // borramos la fila de BD para no dejar fantasmas.
    const head = await headObject(env, m.r2Key);
    if (!head) {
      // Rollback: la fila se creó al pedir upload-url pero el PUT nunca llegó.
      await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
      throw new HTTPException(400, { message: 'upload_not_found_in_r2' });
    }

    // Comprobación extra: si el tamaño real difiere mucho del declarado,
    // podría ser upload truncado. Permitimos ±5% de margen por overhead HTTP.
    const expectedBytes = m.sizeKb * 1024;
    const diff = Math.abs(head.sizeBytes - expectedBytes) / Math.max(expectedBytes, 1);
    if (diff > 0.5) {
      await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
      await deleteObject(env, m.r2Key).catch(() => void 0);
      throw new HTTPException(400, { message: 'upload_size_mismatch' });
    }

    const updates: Partial<typeof mediaAssets.$inferInsert> = {
      // Actualizamos con el tamaño real reportado por R2, no el declarado.
      sizeKb: Math.round(head.sizeBytes / 1024)
    };
    if (body.width) updates.width = body.width;
    if (body.height) updates.height = body.height;
    if (body.altText) {
      updates.altText = body.altText;
      updates.hasAltText = Object.values(body.altText).some(v => typeof v === 'string' && v.trim().length > 0);
    }
    await db.update(mediaAssets).set(updates).where(eq(mediaAssets.id, id));
    const dto = await toDto(env, id);
    return c.json({ media: dto });
  });

  // ─── GET /media  con filtros ───────────────────────────────────
  app.get('/', async (c) => {
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const allowed = await allowedRestaurantIds(c);
    const restaurantSlug = c.req.query('restaurantSlug');
    const usage = c.req.query('usage');
    const missingAlt = c.req.query('missingAlt');

    const conds = [];
    if (restaurantSlug) {
      const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, restaurantSlug) });
      if (!r) return c.json({ media: [] });
      if (allowed && !allowed.has(r.id)) throw new HTTPException(403, { message: 'restaurant_forbidden' });
      conds.push(eq(mediaAssets.restaurantId, r.id));
    } else if (allowed) {
      const ids = Array.from(allowed);
      if (ids.length === 0) return c.json({ media: [] });
      conds.push(inArray(mediaAssets.restaurantId, ids));
    }
    if (usage) conds.push(eq(mediaAssets.usage, usage as any));
    if (missingAlt === 'true') conds.push(eq(mediaAssets.hasAltText, false));

    const rows = await db.query.mediaAssets.findMany({
      where: conds.length > 0 ? and(...conds) : undefined,
      orderBy: [asc(mediaAssets.createdAt)]
    });
    const dtos = await Promise.all(rows.map(m => toDto(env, m.id)));
    return c.json({ media: dtos });
  });

  // ─── PATCH /media/:id  (usage, alt) ────────────────────────────
  app.patch('/:id', zValidator('json', patchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const m = await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
    if (!m) throw new HTTPException(404, { message: 'not_found' });
    if (m.restaurantId) {
      const r = await db.query.restaurants.findFirst({ where: eq(restaurants.id, m.restaurantId) });
      if (r) await assertRestaurantAccess(c, r.slug);
    }
    const updates: Partial<typeof mediaAssets.$inferInsert> = {};
    if (body.usage !== undefined) updates.usage = body.usage;
    if (body.altText !== undefined) {
      updates.altText = body.altText;
      updates.hasAltText = Object.values(body.altText).some(v => typeof v === 'string' && v.trim().length > 0);
    } else if (body.hasAltText !== undefined) {
      updates.hasAltText = body.hasAltText;
    }
    await db.update(mediaAssets).set(updates).where(eq(mediaAssets.id, id));
    const dto = await toDto(env, id);
    return c.json({ media: dto });
  });

  // ─── GET /media/:id/references ─────────────────────────────────
  // Lista dónde se usa un asset: platos y espacios (hero). Útil en la UI
  // antes de permitir borrarlo ("no puedes borrar: usado en 3 platos").
  app.get('/:id/references', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const refs = await findMediaReferences(env, id);
    return c.json(refs);
  });

  // ─── DELETE /media/:id  (BD + R2 si no hay refs) ───────────────
  app.delete('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const m = await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
    if (!m) throw new HTTPException(404, { message: 'not_found' });
    if (m.restaurantId) {
      const r = await db.query.restaurants.findFirst({ where: eq(restaurants.id, m.restaurantId) });
      if (r) await assertRestaurantAccess(c, r.slug);
    }

    // Chequeo integral de refs: platos + espacios (hero en jsonb).
    const refs = await findMediaReferences(env, id);
    if (refs.dishes.length + refs.spaces.length > 0) {
      throw new HTTPException(400, {
        message: `media_in_use:dishes=${refs.dishes.length},spaces=${refs.spaces.length}`
      });
    }

    // Borrar objeto R2 (best-effort — si falla, al menos quitamos de BD)
    try {
      await deleteObject(env, m.r2Key);
    } catch (err) {
      console.error('[media] R2 delete failed:', err);
    }
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    return c.json({ ok: true });
  });

  return app;
}

/**
 * Encuentra dónde se usa un media asset.
 * - dishes.imageAssetId (FK real)
 * - spaces.hero->>'imageAssetId' (jsonb, consulta JSON de Postgres)
 */
async function findMediaReferences(env: any, mediaId: string) {
  const db = getDb(env.DATABASE_URL);

  const [dishRows, spaceRows] = await Promise.all([
    db.select({ id: dishes.id, name: dishes.name })
      .from(dishes)
      .where(eq(dishes.imageAssetId, mediaId)),
    // JSON path: spaces.hero->>'imageAssetId' = $mediaId
    db.execute(sql`
      SELECT s.id, s.name, s.slug AS "spaceSlug", r.slug AS "restaurantSlug"
      FROM spaces s
      JOIN restaurants r ON r.id = s.restaurant_id
      WHERE s.hero ->> 'imageAssetId' = ${mediaId}
    `)
  ]);

  return {
    dishes: dishRows.map(d => ({
      id: d.id,
      name: (d.name as Record<string, string>)?.es ?? '(sin nombre)'
    })),
    spaces: ((spaceRows as any).rows ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.spaceSlug,
      restaurantSlug: s.restaurantSlug
    }))
  };
}
