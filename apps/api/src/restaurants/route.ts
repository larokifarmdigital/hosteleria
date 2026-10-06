import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { userRestaurants } from '../db/schema/auth.js';
import { requireAuth, requireAdmin, requireRestaurant, type AuthVars } from '../auth/middleware.js';
import { cacheHeaders } from '../middleware/cache.js';
import { fireRebuildHook } from '../integrations/rebuild-hook.js';
import { listRestaurantsAggregated } from './repository.js';
import { toDto, aggregatedRowToDto } from './dto.js';
import {
  createRestaurantWithLocales,
  patchRestaurant,
  discardChanges,
  deleteRestaurant
} from './service.js';
import type { Env } from '../env.js';

/**
 * Rutas HTTP de restaurantes.
 *
 * Handlers THIN: validan body, llaman al service, mapean a DTO, respuesta.
 * Lógica de BD y branching en `service.ts`. Construcción de DTOs en `dto.ts`.
 * Query SQL optimizada del listado en `repository.ts`.
 *
 * **Endpoints**:
 *  - `GET  /restaurants`                  — listado (dashboard)
 *  - `GET  /restaurants/:slug`            — detalle
 *  - `POST /restaurants`                  — crear (admin)
 *  - `PATCH /restaurants/:slug`           — editar + opcional publish
 *  - `POST /restaurants/:slug/discard`    — descartar cambios al último snapshot
 *  - `DELETE /restaurants/:slug`          — borrar (admin)
 */
export function createRestaurantsRoutes() {
  const app = new Hono<{ Bindings: Env; Variables: AuthVars }>();

  // ─── GET /restaurants ─────────────────────────────────────────────
  // Editors solo ven los suyos. Admins ven todos. 1 sola SQL con aggregates.
  app.get('/', requireAuth, cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const user = c.get('user')!;

    let allowedIds: string[] | undefined;
    if (user.role === 'editor') {
      const db = getDb(c.env.DATABASE_URL);
      const rows = await db
        .select({ id: userRestaurants.restaurantId })
        .from(userRestaurants)
        .where(eq(userRestaurants.userId, user.id));
      allowedIds = rows.map(r => r.id);
    }

    const rows = await listRestaurantsAggregated(c.env, { allowedIds });
    return c.json({ restaurants: rows.map(aggregatedRowToDto) });
  });

  // ─── GET /restaurants/:slug ───────────────────────────────────────
  app.get('/:slug', requireAuth, requireRestaurant('slug'), cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const db = getDb(c.env.DATABASE_URL);
    const r = await db.query.restaurants.findFirst({ where: (t, { eq }) => eq(t.slug, c.req.param('slug')) });
    if (!r) return c.json({ error: 'not_found' }, 404);
    return c.json({ restaurant: await toDto(c.env, r.id) });
  });

  // ─── POST /restaurants ────────────────────────────────────────────
  app.post('/', requireAdmin, zValidator('json', createSchema), async (c) => {
    const { id } = await createRestaurantWithLocales(c.env, c.req.valid('json'));
    return c.json({ restaurant: await toDto(c.env, id) }, 201);
  });

  // ─── PATCH /restaurants/:slug ─────────────────────────────────────
  app.patch('/:slug', requireAuth, requireRestaurant('slug'), zValidator('json', patchSchema), async (c) => {
    const user = c.get('user')!;
    const result = await patchRestaurant(c.env, c.req.param('slug'), c.req.valid('json'), user.id);

    // Fire-and-forget: no bloquea la respuesta.
    if (result.shouldRebuild && result.rebuildHookUrl) {
      void fireRebuildHook(result.rebuildHookUrl, { restaurantSlug: result.slug });
    }

    return c.json({ restaurant: await toDto(c.env, result.id) });
  });

  // ─── POST /restaurants/:slug/discard ──────────────────────────────
  app.post('/:slug/discard', requireAuth, requireRestaurant('slug'), async (c) => {
    const user = c.get('user')!;
    const { id } = await discardChanges(c.env, c.req.param('slug'), user.id);
    return c.json({ restaurant: await toDto(c.env, id) });
  });

  // ─── DELETE /restaurants/:slug ────────────────────────────────────
  app.delete('/:slug', requireAdmin, async (c) => {
    await deleteRestaurant(c.env, c.req.param('slug'));
    return c.json({ ok: true });
  });

  return app;
}

// ═══════════════════════════════════════════════════════════════════
// Zod schemas — validación del body de los endpoints.
// ═══════════════════════════════════════════════════════════════════

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
