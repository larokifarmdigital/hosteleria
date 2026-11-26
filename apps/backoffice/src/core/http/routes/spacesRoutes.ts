import { Hono } from 'hono';
import { validate } from '../validate';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { requireAuth, requireRestaurant } from '../middleware/authMiddleware';
import { assertMediaInRestaurant } from '../accessControl';
import { spaceToDto } from '../dto/spaceDto';
import { spaceMediaIds } from '@/core/spaces';
import { addressSchema, i18nSchema, assetIdSchema } from '../schemas';
import type { AppBindings } from '../types';

export function createSpacesRoutes() {
  const app = new Hono<AppBindings>();

  app.use('*', requireAuth);
  app.use('*', requireRestaurant('slug'));

  async function resolveRestaurantId(c: any): Promise<string> {
    const slug = c.req.param('slug');
    const r = await c.get('container').repos.restaurantsRepo.findBySlug(slug);
    if (!r) throw new HTTPException(404, { message: 'RESTAURANT_NOT_FOUND' });
    return r.id;
  }

  app.get('/', async (c) => {
    const slug = c.req.param('slug')!;
    const list = await c.get('container').spaces.list.execute(slug);
    return c.json({ spaces: list.map(spaceToDto) });
  });

  app.get('/:spaceId', async (c) => {
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.get.execute(restaurantId, c.req.param('spaceId'));
    return c.json({ space: spaceToDto(s) });
  });

  app.post('/', validate('json', createSchema), async (c) => {
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.create.execute(restaurantId, c.req.valid('json'));
    return c.json({ space: spaceToDto(s) }, 201);
  });

  app.patch('/:spaceId', validate('json', patchSchema), async (c) => {
    const user = c.get('user')!;
    const restaurantId = await resolveRestaurantId(c);
    const body = c.req.valid('json');
    for (const id of new Set(spaceMediaIds(body))) await assertMediaInRestaurant(c, id, restaurantId);
    const s = await c.get('container').spaces.patch.execute(
      restaurantId, c.req.param('spaceId'), body, user.id
    );
    // El orden y cuál es el principal también esperan a publicar: la web lee la copia publicada.
    if (body.state === 'published') {
      await c.get('container').public.saveCopy.execute(c.req.param('slug')!, user.id);
      c.set('rebuild', { spaceId: s.id });
    }
    return c.json({ space: spaceToDto(s) });
  });

  app.post('/:spaceId/discard', async (c) => {
    const user = c.get('user')!;
    const restaurantId = await resolveRestaurantId(c);
    const s = await c.get('container').spaces.discard.execute(restaurantId, c.req.param('spaceId'), user.id);
    return c.json({ space: spaceToDto(s) });
  });

  app.delete('/:spaceId', async (c) => {
    const user = c.get('user')!;
    const restaurantId = await resolveRestaurantId(c);
    // Sigue en la web (en la copia publicada) hasta publicar.
    await c.get('container').spaces.delete.execute(restaurantId, c.req.param('spaceId'), user.id);
    return c.json({ ok: true });
  });

  return app;
}

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
  schedule: scheduleSchema.optional(),
  gallery: z.array(assetIdSchema).max(60).optional(),
  scheduleTexts: z.object({
    title: i18nSchema.optional(),
    text: i18nSchema.optional(),
    open: i18nSchema.optional(),
    nextOpening: i18nSchema.optional(),
    closed: i18nSchema.optional()
  }).optional(),
  address: addressSchema.optional(),
  mapUrl: z.string().max(2000).nullable().optional(),
  bookingContact: z.object({
    phone: z.string().max(40).optional(),
    whatsapp: z.string().max(40).optional(),
    email: z.string().email().optional().or(z.literal(''))
  }).optional()
}).partial();
