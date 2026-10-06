import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { requireAuth, requireRestaurant } from '../middleware/authMiddleware.js';
import { spaceToDto } from '../dto/spaceDto.js';
import type { AppBindings } from '../types.js';

export function createSpacesRoutes() {
  const app = new Hono<AppBindings>();

  app.use('*', requireAuth);
  app.use('*', requireRestaurant('slug'));

  async function resolveRestaurantId(c: any): Promise<string> {
    const slug = c.req.param('slug');
    const r = await c.get('container').repos.restaurantsRepo.findBySlug(slug);
    if (!r) throw new HTTPException(404, { message: 'restaurant_not_found' });
    return r.id;
  }

  // ─── GET / ─────────────────────────────────────────────────────
  app.get('/', async (c) => {
    const slug = c.req.param('slug')!;
    const list = await c.get('container').spaces.list.execute(slug);
    return c.json({ spaces: list.map(spaceToDto) });
  });

  // ─── GET /:spaceId ─────────────────────────────────────────────
  app.get('/:spaceId', async (c) => {
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.get.execute(restaurantId, c.req.param('spaceId'));
    return c.json({ space: spaceToDto(s) });
  });

  // ─── POST / ────────────────────────────────────────────────────
  app.post('/', zValidator('json', createSchema), async (c) => {
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.create.execute(restaurantId, c.req.valid('json'));
    return c.json({ space: spaceToDto(s) }, 201);
  });

  // ─── PATCH /:spaceId ───────────────────────────────────────────
  app.patch('/:spaceId', zValidator('json', patchSchema), async (c) => {
    const user = c.get('user')!;
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.patch.execute(
      restaurantId, c.req.param('spaceId'), c.req.valid('json'), user.id
    );
    return c.json({ space: spaceToDto(s) });
  });

  // ─── POST /:spaceId/discard ────────────────────────────────────
  app.post('/:spaceId/discard', async (c) => {
    const user = c.get('user')!;
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.discard.execute(restaurantId, c.req.param('spaceId'), user.id);
    return c.json({ space: spaceToDto(s) });
  });

  // ─── DELETE /:spaceId ──────────────────────────────────────────
  app.delete('/:spaceId', async (c) => {
    const user = c.get('user')!;
    const restaurantId = await resolveRestaurantId(c);
    await c.get('container').spaces.delete.execute(restaurantId, c.req.param('spaceId'), user.id);
    return c.json({ ok: true });
  });

  return app;
}

const i18nSchema = z.record(z.string());

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
