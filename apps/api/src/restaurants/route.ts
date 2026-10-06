import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, asc, and } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { restaurants, languages, restaurantLocales } from '../db/schema/content.js';
import { userRestaurants } from '../db/schema/auth.js';
import { requireAuth, requireAdmin, requireRestaurant, type AuthVars } from '../auth/middleware.js';
import { countByRestaurant, getActiveLocaleCodes } from '../restaurants/stats.js';
import { fireRebuildHook } from '../integrations/rebuild-hook.js';
import { cacheHeaders } from '../middleware/cache.js';
import { listRestaurantsAggregated } from '../restaurants/repository.js';

const addressSchema = z.object({
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  country: z.string().optional()
}).partial();

const contactSchema = z.object({
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  web: z.string().url().optional().or(z.literal(''))
}).partial();

const socialsSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal(''))
}).partial();

const createSchema = z.object({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'slug: minúsculas, dígitos y guiones'),
  name: z.string().min(1).max(120),
  domain: z.string().min(1).max(255),
  logoInitial: z.string().max(3).default(''),
  defaultLocaleCode: z.string().min(2).max(5),
  activeLocaleCodes: z.array(z.string().min(2).max(5)).min(1)
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: z.string().min(1).max(255).optional(),
  logoInitial: z.string().max(3).optional(),
  coverGradient: z.string().optional(),
  state: z.enum(['published', 'draft', 'warnings', 'new']).optional(),
  acceptsBookings: z.boolean().optional(),
  showSocials: z.boolean().optional(),
  address: addressSchema.optional(),
  contact: contactSchema.optional(),
  socials: socialsSchema.optional(),
  defaultLocaleCode: z.string().min(2).max(5).optional(),
  activeLocaleCodes: z.array(z.string().min(2).max(5)).min(1).optional(),
  timezone: z.string().min(1).max(64).optional(),
  rebuildHookUrl: z.string().url().nullable().optional(),
  seo: z.object({
    title: z.record(z.string()).optional(),
    description: z.record(z.string()).optional()
  }).optional()
}).partial();

/**
 * Devuelve el DTO completo de un restaurante — con locales, contadores
 * derivados y campos calculados. Es el shape que espera `Restaurant` en
 * apps/backoffice/src/lib/types.ts.
 */
async function toDto(env: any, restaurantId: string) {
  const db = getDb(env.DATABASE_URL);
  const r = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    with: { defaultLocale: true }
  });
  if (!r) return null;

  const [activeLocales, counters] = await Promise.all([
    getActiveLocaleCodes(env, restaurantId),
    countByRestaurant(env, restaurantId)
  ]);

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    domain: r.domain,
    logoInitial: r.logoInitial,
    coverGradient: r.coverGradient,
    state: r.state,
    activeLocales,
    defaultLocale: r.defaultLocale.code,
    acceptsBookings: r.acceptsBookings,
    showSocials: r.showSocials,
    timezone: r.timezone,
    rebuildHookUrl: r.rebuildHookUrl,
    address: r.address ?? {},
    contact: r.contact ?? {},
    socials: r.socials ?? {},
    seo: r.seo ?? {},
    lastPublishedAt: r.lastPublishedAt?.toISOString() ?? null,
    completePercent: 0, // TODO: calcular tras cargar hero (task siguiente); por ahora 0
    spacesCount: counters.spacesCount,
    dishesCount: counters.dishesCount,
    winesCount: counters.winesCount
  };
}

export function createRestaurantsRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();

  // ─── GET /restaurants ──────────────────────────────────────────
  // Editors solo ven los suyos. Admins ven todos.
  // 1 sola query SQL con aggregates — ver lib/restaurant-list.ts.
  app.get('/', requireAuth, cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const env = c.get('env');
    const user = c.get('user')!;
    const db = getDb(env.DATABASE_URL);

    let allowedIds: string[] | undefined;
    if (user.role === 'editor') {
      const rows = await db
        .select({ id: userRestaurants.restaurantId })
        .from(userRestaurants)
        .where(eq(userRestaurants.userId, user.id));
      allowedIds = rows.map(r => r.id);
    }

    const rows = await listRestaurantsAggregated(env, { allowedIds });
    const dtos = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      domain: r.domain,
      logoInitial: r.logoInitial,
      coverGradient: r.coverGradient,
      state: r.state,
      activeLocales: r.activeLocaleCodes,
      defaultLocale: r.defaultLocaleCode,
      acceptsBookings: r.acceptsBookings,
      showSocials: r.showSocials,
      timezone: r.timezone,
      rebuildHookUrl: r.rebuildHookUrl,
      address: r.address ?? {},
      contact: r.contact ?? {},
      socials: r.socials ?? {},
      seo: r.seo ?? {},
      lastPublishedAt: r.lastPublishedAt?.toISOString() ?? null,
      completePercent: 0,
      spacesCount: r.spacesCount,
      dishesCount: r.dishesCount,
      winesCount: r.winesCount
    }));
    return c.json({ restaurants: dtos });
  });

  // ─── GET /restaurants/:slug ────────────────────────────────────
  app.get('/:slug', requireAuth, requireRestaurant('slug'), cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const env = c.get('env');
    const slug = c.req.param('slug');
    const db = getDb(env.DATABASE_URL);
    const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
    if (!r) throw new HTTPException(404, { message: 'not_found' });
    const dto = await toDto(env, r.id);
    return c.json({ restaurant: dto });
  });

  // ─── POST /restaurants ─────────────────────────────────────────
  app.post('/', requireAdmin, zValidator('json', createSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);

    const existing = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, body.slug) });
    if (existing) throw new HTTPException(409, { message: 'slug_taken' });

    const localesRows = await db.query.languages.findMany();
    const codeToId = new Map(localesRows.map(l => [l.code, l.id]));
    const defaultId = codeToId.get(body.defaultLocaleCode);
    if (!defaultId) throw new HTTPException(400, { message: `unknown_locale:${body.defaultLocaleCode}` });

    const activeIds = body.activeLocaleCodes.map(code => {
      const id = codeToId.get(code);
      if (!id) throw new HTTPException(400, { message: `unknown_locale:${code}` });
      return id;
    });
    if (!activeIds.includes(defaultId)) activeIds.push(defaultId);

    // Transaction: si falla el insert de locales, hace rollback del
    // restaurante también. Evita restaurantes huérfanos sin locales.
    const row = await db.transaction(async (tx) => {
      const [r] = await tx.insert(restaurants).values({
        slug: body.slug,
        name: body.name,
        domain: body.domain,
        logoInitial: body.logoInitial || body.name.charAt(0).toUpperCase(),
        defaultLocaleId: defaultId,
        state: 'draft'
      }).returning({ id: restaurants.id });

      await tx.insert(restaurantLocales).values(
        activeIds.map(languageId => ({ restaurantId: r.id, languageId }))
      );
      return r;
    });

    const dto = await toDto(env, row.id);
    return c.json({ restaurant: dto }, 201);
  });

  // ─── PATCH /restaurants/:slug ──────────────────────────────────
  app.patch('/:slug', requireAuth, requireRestaurant('slug'), zValidator('json', patchSchema), async (c) => {
    const env = c.get('env');
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);

    const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
    if (!r) throw new HTTPException(404, { message: 'not_found' });

    const updates: Partial<typeof restaurants.$inferInsert> = {
      updatedAt: new Date()
    };
    if (body.name !== undefined) updates.name = body.name;
    if (body.domain !== undefined) updates.domain = body.domain;
    if (body.logoInitial !== undefined) updates.logoInitial = body.logoInitial;
    if (body.coverGradient !== undefined) updates.coverGradient = body.coverGradient;
    const user = c.get('user')!;
    updates.updatedBy = user.id;
    const wasPublished = r.state === 'published';
    const willBePublished = body.state === 'published';
    if (body.state !== undefined) {
      updates.state = body.state;
      if (body.state === 'published') {
        updates.lastPublishedAt = new Date();
        // Snapshot: copia los campos editables actuales. Al descartar
        // cambios, se restauran desde aquí.
        updates.publishedSnapshot = {
          name: r.name, domain: r.domain, logoInitial: r.logoInitial,
          coverGradient: r.coverGradient, timezone: r.timezone,
          address: r.address, contact: r.contact, socials: r.socials,
          seo: r.seo, acceptsBookings: r.acceptsBookings, showSocials: r.showSocials,
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.domain !== undefined ? { domain: body.domain } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.contact !== undefined ? { contact: body.contact } : {}),
          ...(body.socials !== undefined ? { socials: body.socials } : {}),
          ...(body.seo !== undefined ? { seo: body.seo } : {})
        };
      }
    }
    if (body.acceptsBookings !== undefined) updates.acceptsBookings = body.acceptsBookings;
    if (body.showSocials !== undefined) updates.showSocials = body.showSocials;
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.rebuildHookUrl !== undefined) updates.rebuildHookUrl = body.rebuildHookUrl;
    if (body.address) updates.address = body.address;
    if (body.contact) updates.contact = body.contact;
    if (body.socials) updates.socials = body.socials;
    if (body.seo) updates.seo = body.seo;

    if (body.defaultLocaleCode) {
      const lang = await db.query.languages.findFirst({ where: eq(languages.code, body.defaultLocaleCode) });
      if (!lang) throw new HTTPException(400, { message: `unknown_locale:${body.defaultLocaleCode}` });
      updates.defaultLocaleId = lang.id;
    }

    // Transaction: patch + reemplazo de locales en una sola unidad.
    // Si falla el insert nuevo, se mantienen los locales viejos (rollback).
    await db.transaction(async (tx) => {
      await tx.update(restaurants).set(updates).where(eq(restaurants.id, r.id));

      if (body.activeLocaleCodes) {
        const langs = await tx.query.languages.findMany();
        const codeToId = new Map(langs.map(l => [l.code, l.id]));
        const activeIds = body.activeLocaleCodes.map(code => {
          const id = codeToId.get(code);
          if (!id) throw new HTTPException(400, { message: `unknown_locale:${code}` });
          return id;
        });
        await tx.delete(restaurantLocales).where(eq(restaurantLocales.restaurantId, r.id));
        if (activeIds.length > 0) {
          await tx.insert(restaurantLocales).values(activeIds.map(languageId => ({ restaurantId: r.id, languageId })));
        }
      }
    });

    const dto = await toDto(env, r.id);

    // Trigger de rebuild: solo cuando pasa a published, o si estaba
    // publicado y el admin modificó datos que afectan a la landing.
    // Para MVP: trigger en cualquier PATCH si está publicado o acaba de
    // publicarse — los providers de deploy (Vercel/CF Pages/Netlify)
    // deduplican rebuilds concurrentes automáticamente.
    const shouldRebuild = (willBePublished && !wasPublished) || (wasPublished && !body.state);
    if (shouldRebuild && dto && r.rebuildHookUrl) {
      void fireRebuildHook(r.rebuildHookUrl, { restaurantSlug: r.slug });
    }

    return c.json({ restaurant: dto });
  });

  // ─── POST /restaurants/:slug/discard ───────────────────────────
  // Restaura los campos del restaurante al último snapshot publicado.
  // Útil cuando el editor hizo cambios en borrador y quiere volver atrás.
  app.post('/:slug/discard', requireAuth, requireRestaurant('slug'), async (c) => {
    const env = c.get('env');
    const slug = c.req.param('slug');
    const db = getDb(env.DATABASE_URL);
    const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
    if (!r) throw new HTTPException(404, { message: 'not_found' });
    if (!r.publishedSnapshot) throw new HTTPException(400, { message: 'no_snapshot' });

    const snap = r.publishedSnapshot as Record<string, any>;
    const user = c.get('user')!;
    await db.update(restaurants).set({
      name: snap.name ?? r.name,
      domain: snap.domain ?? r.domain,
      logoInitial: snap.logoInitial ?? r.logoInitial,
      coverGradient: snap.coverGradient ?? r.coverGradient,
      timezone: snap.timezone ?? r.timezone,
      address: snap.address ?? r.address,
      contact: snap.contact ?? r.contact,
      socials: snap.socials ?? r.socials,
      seo: snap.seo ?? r.seo,
      acceptsBookings: snap.acceptsBookings ?? r.acceptsBookings,
      showSocials: snap.showSocials ?? r.showSocials,
      state: 'published',
      updatedAt: new Date(),
      updatedBy: user.id
    }).where(eq(restaurants.id, r.id));

    const dto = await toDto(env, r.id);
    return c.json({ restaurant: dto });
  });

  // ─── DELETE /restaurants/:slug ─────────────────────────────────
  app.delete('/:slug', requireAdmin, async (c) => {
    const env = c.get('env');
    const slug = c.req.param('slug');
    const db = getDb(env.DATABASE_URL);
    const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
    if (!r) throw new HTTPException(404, { message: 'not_found' });
    await db.delete(restaurants).where(eq(restaurants.id, r.id));
    return c.json({ ok: true });
  });

  return app;
}
