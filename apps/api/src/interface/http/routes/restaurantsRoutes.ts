import { Hono } from 'hono';
import { validate } from '../validate.js';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireRestaurant } from '../middleware/authMiddleware.js';
import { cacheHeaders } from '../../../middleware/cache.js';
import { restaurantToDto } from '../dto/restaurantDto.js';
import { RestaurantNotFoundError } from '../../../domain/models/restaurant.js';
import type { AppBindings } from '../types.js';

export function createRestaurantsRoutes() {
  const app = new Hono<AppBindings>();

  // ─── GET /restaurants ─────────────────────────────────────────────
  app.get('/', requireAuth, cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const user = c.get('user')!;
    const list = await c.get('container').restaurants.list.execute(user);
    return c.json({ restaurants: list.map(restaurantToDto) });
  });

  // ─── GET /restaurants/:slug ───────────────────────────────────────
  app.get('/:slug', requireAuth, requireRestaurant('slug'), cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const r = await c.get('container').restaurants.get.execute(c.req.param('slug'));
    return c.json({ restaurant: restaurantToDto(r) });
  });

  // ─── POST /restaurants ────────────────────────────────────────────
  app.post('/', requireAdmin, validate('json', createSchema), async (c) => {
    const r = await c.get('container').restaurants.create.execute(c.req.valid('json'));
    return c.json({ restaurant: restaurantToDto(r) }, 201);
  });

  // ─── PATCH /restaurants/:slug ─────────────────────────────────────
  app.patch('/:slug', requireAuth, requireRestaurant('slug'), validate('json', patchSchema), async (c) => {
    const user = c.get('user')!;
    const slug = c.req.param('slug');
    await c.get('container').restaurants.patch.execute(slug, c.req.valid('json'), user.id);
    const r = await c.get('container').restaurants.get.execute(slug);
    return c.json({ restaurant: restaurantToDto(r) });
  });

  // ─── POST /restaurants/:slug/discard ──────────────────────────────
  app.post('/:slug/discard', requireAuth, requireRestaurant('slug'), async (c) => {
    const user = c.get('user')!;
    const slug = c.req.param('slug');
    await c.get('container').restaurants.discard.execute(slug, user.id);
    const r = await c.get('container').restaurants.get.execute(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    return c.json({ restaurant: restaurantToDto(r) });
  });

  // ─── DELETE /restaurants/:slug ────────────────────────────────────
  app.delete('/:slug', requireAdmin, async (c) => {
    await c.get('container').restaurants.delete.execute(c.req.param('slug'));
    return c.json({ ok: true });
  });

  return app;
}

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
