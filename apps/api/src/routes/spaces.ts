import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, and, asc, count, ne } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  restaurants,
  spaces,
  spaceSchedule,
  dishes,
  wines
} from '../db/schema/content';
import { requireAuth, requireRestaurant, type AuthVars } from '../auth/middleware';

const i18nSchema = z.record(z.string()); // { es: "...", ca: "...", ... }

const heroSchema = z.object({
  title: i18nSchema.optional(),
  subtitle: i18nSchema.optional(),
  metaLeft: i18nSchema.optional(),
  metaRight: i18nSchema.optional(),
  note: i18nSchema.optional(),
  cta: i18nSchema.optional(),
  imageAlt: i18nSchema.optional(),
  imageAssetId: z.string().optional()
}).partial();

const manifestoSchema = z.object({
  eyebrow: i18nSchema.optional(),
  text: i18nSchema.optional()
}).partial();

const shiftSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'formato HH:mm'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'formato HH:mm')
});

const scheduleSchema = z.array(z.object({
  day: z.enum(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']),
  shifts: z.array(shiftSchema)
}));

const createSchema = z.object({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  type: z.enum(['restaurant', 'cafe', 'coctel', 'club', 'terraza', 'live_music', 'otro']).default('restaurant'),
  descriptor: z.string().max(200).default(''),
  isDefault: z.boolean().default(false)
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(['restaurant', 'cafe', 'coctel', 'club', 'terraza', 'live_music', 'otro']).optional(),
  descriptor: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  coverGradient: z.string().optional(),
  state: z.enum(['published', 'draft', 'warnings', 'new']).optional(),
  hero: heroSchema.optional(),
  manifesto: manifestoSchema.optional(),
  schedule: scheduleSchema.optional()
}).partial();

/**
 * Resuelve el restaurantId a partir de :slug, verificando permisos.
 * Se comparte entre todas las rutas.
 */
async function resolveRestaurantId(c: any): Promise<string> {
  const env = c.get('env');
  const slug = c.req.param('slug');
  const db = getDb(env.DATABASE_URL);
  const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
  if (!r) throw new HTTPException(404, { message: 'restaurant_not_found' });
  return r.id;
}

/** DTO completo de un espacio — mismo shape que apps/backoffice types.Space. */
async function toDto(env: any, spaceId: string) {
  const db = getDb(env.DATABASE_URL);
  const s = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
  if (!s) return null;

  const [scheduleRows, dishesN, winesN] = await Promise.all([
    db.select().from(spaceSchedule).where(eq(spaceSchedule.spaceId, spaceId)).orderBy(asc(spaceSchedule.day), asc(spaceSchedule.order)),
    db.select({ n: count() }).from(dishes).where(eq(dishes.spaceId, spaceId)),
    db.select({ n: count() }).from(wines).where(eq(wines.spaceId, spaceId))
  ]);

  // Agrupar schedule por día
  const scheduleByDay = new Map<string, Array<{ open: string; close: string }>>();
  for (const row of scheduleRows) {
    if (!scheduleByDay.has(row.day)) scheduleByDay.set(row.day, []);
    scheduleByDay.get(row.day)!.push({ open: row.open, close: row.close });
  }
  const schedule = (['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const).map(day => ({
    day,
    shifts: scheduleByDay.get(day) ?? []
  }));

  return {
    id: s.id,
    restaurantId: s.restaurantId,
    slug: s.slug,
    name: s.name,
    type: s.type,
    isDefault: s.isDefault,
    order: s.order,
    state: s.state,
    coverGradient: s.coverGradient,
    descriptor: s.descriptor,
    hero: s.hero ?? {},
    manifesto: s.manifesto ?? {},
    schedule,
    galleryCount: 0, // TODO: contar media_assets cuando conectemos media
    dishesCount: Number(dishesN[0]?.n ?? 0),
    winesCount: Number(winesN[0]?.n ?? 0),
    completePercent: 0, // TODO
    lastEditedAt: s.updatedAt.toISOString()
  };
}

export function createSpacesRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();

  // Todas las rutas requieren auth + acceso al restaurante padre.
  app.use('*', requireAuth);
  app.use('*', requireRestaurant('slug'));

  // ─── GET /restaurants/:slug/spaces ─────────────────────────────
  app.get('/', async (c) => {
    const env = c.get('env');
    const restaurantId = await resolveRestaurantId(c);
    const db = getDb(env.DATABASE_URL);
    const rows = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.restaurantId, restaurantId))
      .orderBy(asc(spaces.order), asc(spaces.name));
    const dtos = await Promise.all(rows.map(r => toDto(env, r.id)));
    return c.json({ spaces: dtos });
  });

  // ─── GET /restaurants/:slug/spaces/:spaceId ────────────────────
  app.get('/:spaceId', async (c) => {
    const env = c.get('env');
    const restaurantId = await resolveRestaurantId(c);
    const spaceId = c.req.param('spaceId');
    const db = getDb(env.DATABASE_URL);
    const s = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
    if (!s || s.restaurantId !== restaurantId) throw new HTTPException(404, { message: 'not_found' });
    const dto = await toDto(env, s.id);
    return c.json({ space: dto });
  });

  // ─── POST /restaurants/:slug/spaces ────────────────────────────
  app.post('/', zValidator('json', createSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    const restaurantId = await resolveRestaurantId(c);
    const db = getDb(env.DATABASE_URL);

    // Slug único dentro del restaurante
    const existing = await db.query.spaces.findFirst({
      where: and(eq(spaces.restaurantId, restaurantId), eq(spaces.slug, body.slug))
    });
    if (existing) throw new HTTPException(409, { message: 'slug_taken' });

    // Si el nuevo es default → quitar default a los demás
    if (body.isDefault) {
      await db.update(spaces).set({ isDefault: false }).where(eq(spaces.restaurantId, restaurantId));
    } else {
      // Si es el primer espacio del restaurante y no viene isDefault, forzamos true
      const [{ n }] = await db.select({ n: count() }).from(spaces).where(eq(spaces.restaurantId, restaurantId));
      if (Number(n) === 0) body.isDefault = true;
    }

    // Orden = siguiente
    const [{ n: currentCount }] = await db.select({ n: count() }).from(spaces).where(eq(spaces.restaurantId, restaurantId));

    const [row] = await db.insert(spaces).values({
      restaurantId,
      slug: body.slug,
      name: body.name,
      type: body.type,
      descriptor: body.descriptor,
      isDefault: body.isDefault,
      order: Number(currentCount),
      state: 'draft'
    }).returning({ id: spaces.id });

    const dto = await toDto(env, row.id);
    return c.json({ space: dto }, 201);
  });

  // ─── PATCH /restaurants/:slug/spaces/:spaceId ──────────────────
  app.patch('/:spaceId', zValidator('json', patchSchema), async (c) => {
    const env = c.get('env');
    const restaurantId = await resolveRestaurantId(c);
    const spaceId = c.req.param('spaceId');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);

    const s = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
    if (!s || s.restaurantId !== restaurantId) throw new HTTPException(404, { message: 'not_found' });

    const user = c.get('user')!;
    const updates: Partial<typeof spaces.$inferInsert> = { updatedAt: new Date(), updatedBy: user.id };
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.descriptor !== undefined) updates.descriptor = body.descriptor;
    if (body.order !== undefined) updates.order = body.order;
    if (body.coverGradient !== undefined) updates.coverGradient = body.coverGradient;
    if (body.state !== undefined) {
      updates.state = body.state;
      if (body.state === 'published') {
        updates.publishedSnapshot = {
          hero: body.hero ?? s.hero,
          manifesto: body.manifesto ?? s.manifesto,
          descriptor: body.descriptor ?? s.descriptor,
          coverGradient: body.coverGradient ?? s.coverGradient
        };
      }
    }
    if (body.hero !== undefined) updates.hero = body.hero;
    if (body.manifesto !== undefined) updates.manifesto = body.manifesto;

    // Marcar como default: quitar a los demás primero
    if (body.isDefault === true) {
      await db.update(spaces)
        .set({ isDefault: false })
        .where(and(eq(spaces.restaurantId, restaurantId), ne(spaces.id, spaceId)));
      updates.isDefault = true;
    } else if (body.isDefault === false) {
      // No permitir desmarcar el default si es el único con isDefault=true
      const [{ n }] = await db
        .select({ n: count() })
        .from(spaces)
        .where(and(eq(spaces.restaurantId, restaurantId), eq(spaces.isDefault, true), ne(spaces.id, spaceId)));
      if (Number(n) === 0) throw new HTTPException(400, { message: 'must_have_default_space' });
      updates.isDefault = false;
    }

    // Transaction: patch del espacio + reemplazo del schedule en una sola
    // unidad. Si falla el insert del schedule, el patch tampoco se aplica.
    await db.transaction(async (tx) => {
      await tx.update(spaces).set(updates).where(eq(spaces.id, spaceId));

      if (body.schedule !== undefined) {
        await tx.delete(spaceSchedule).where(eq(spaceSchedule.spaceId, spaceId));
        const rows = body.schedule.flatMap(d =>
          d.shifts.map((shift, idx) => ({
            spaceId,
            day: d.day,
            open: shift.open,
            close: shift.close,
            order: idx
          }))
        );
        if (rows.length > 0) await tx.insert(spaceSchedule).values(rows);
      }
    });

    const dto = await toDto(env, spaceId);
    return c.json({ space: dto });
  });

  // ─── POST /restaurants/:slug/spaces/:spaceId/discard ───────────
  // Restaura el espacio al último snapshot publicado.
  app.post('/:spaceId/discard', async (c) => {
    const env = c.get('env');
    const restaurantId = await resolveRestaurantId(c);
    const spaceId = c.req.param('spaceId');
    const db = getDb(env.DATABASE_URL);
    const s = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
    if (!s || s.restaurantId !== restaurantId) throw new HTTPException(404, { message: 'not_found' });
    if (!s.publishedSnapshot) throw new HTTPException(400, { message: 'no_snapshot' });

    const snap = s.publishedSnapshot as Record<string, any>;
    const user = c.get('user')!;
    await db.update(spaces).set({
      hero: snap.hero ?? s.hero,
      manifesto: snap.manifesto ?? s.manifesto,
      descriptor: snap.descriptor ?? s.descriptor,
      coverGradient: snap.coverGradient ?? s.coverGradient,
      state: 'published',
      updatedAt: new Date(),
      updatedBy: user.id
    }).where(eq(spaces.id, spaceId));

    const dto = await toDto(env, spaceId);
    return c.json({ space: dto });
  });

  // ─── DELETE /restaurants/:slug/spaces/:spaceId ─────────────────
  // Invariante: no se puede eliminar el único espacio (schema JSON-LD).
  app.delete('/:spaceId', async (c) => {
    const env = c.get('env');
    const restaurantId = await resolveRestaurantId(c);
    const spaceId = c.req.param('spaceId');
    const db = getDb(env.DATABASE_URL);

    const s = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
    if (!s || s.restaurantId !== restaurantId) throw new HTTPException(404, { message: 'not_found' });

    const [{ n }] = await db.select({ n: count() }).from(spaces).where(eq(spaces.restaurantId, restaurantId));
    if (Number(n) <= 1) throw new HTTPException(400, { message: 'cannot_delete_last_space' });

    // Transaction: delete + promoción de default. Si falla la promoción,
    // no queremos quedarnos sin default (rollback del delete).
    await db.transaction(async (tx) => {
      await tx.delete(spaces).where(eq(spaces.id, spaceId));

      if (s.isDefault) {
        const remaining = await tx.query.spaces.findFirst({
          where: eq(spaces.restaurantId, restaurantId),
          orderBy: [asc(spaces.order), asc(spaces.name)]
        });
        if (remaining) {
          await tx.update(spaces).set({ isDefault: true }).where(eq(spaces.id, remaining.id));
        }
      }
    });

    return c.json({ ok: true });
  });

  return app;
}
