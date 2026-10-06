import { Hono } from 'hono';
import { validate } from '../validate.js';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';
import { requireAuth } from '../middleware/authMiddleware.js';
import { mediaToDto } from '../dto/mediaDto.js';
import { MediaNotFoundError, type MediaAsset } from '../../../domain/models/media.js';
import { RestaurantNotFoundError } from '../../../domain/models/restaurant.js';
import type { AppBindings } from '../types.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_SIZE_KB = 10_000;

// Flujo browser → R2 directo:
//   1. POST /media/upload-url  → {uploadUrl, mediaId, publicUrl}
//   2. Browser PUT uploadUrl con el binario (presigned, 5 min)
//   3. POST /media/:id/confirm → HEAD contra R2, marca listo o rollback
export function createMediaRoutes() {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  // ─── POST /media/upload-url ────────────────────────────────────
  app.post('/upload-url', validate('json', uploadUrlSchema), async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');
    const restaurantId = await assertRestaurantAccess(c, body.restaurantSlug);
    const result = await c.get('container').media.requestUpload.execute({
      restaurantId,
      restaurantSlug: body.restaurantSlug,
      filename: body.filename,
      mimeType: body.mimeType,
      sizeKb: body.sizeKb,
      uploadedBy: user.id
    });
    return c.json(result);
  });

  // ─── POST /media/:id/confirm ───────────────────────────────────
  app.post('/:id/confirm', validate('json', confirmSchema), async (c) => {
    const id = c.req.param('id');
    const existing = await c.get('container').repos.mediaRepo.findById(id);
    if (!existing) throw new MediaNotFoundError(id);
    await assertMediaAccess(c, existing);
    const m = await c.get('container').media.confirmUpload.execute(id, c.req.valid('json'));
    return c.json({ media: await enrichMedia(c, m) });
  });

  // ─── GET /media ────────────────────────────────────────────────
  app.get('/', async (c) => {
    const allowed = await allowedRestaurantIds(c);
    const restaurantSlug = c.req.query('restaurantSlug') || undefined;
    const usage = c.req.query('usage') as MediaAsset['usage'] | undefined;
    const missingAlt = c.req.query('missingAlt') === 'true';

    if (restaurantSlug && allowed) {
      const r = await c.get('container').repos.restaurantsRepo.findBySlug(restaurantSlug);
      if (r && !allowed.has(r.id)) throw new HTTPException(403, { message: 'RESTAURANT_FORBIDDEN' });
    }

    const list = await c.get('container').media.list.execute({ restaurantSlug, usage, missingAlt });
    const filtered = allowed
      ? list.filter(m => !m.restaurantId || allowed.has(m.restaurantId))
      : list;
    const dtos = await Promise.all(filtered.map(m => enrichMedia(c, m)));
    return c.json({ media: dtos });
  });

  // ─── PATCH /media/:id ──────────────────────────────────────────
  app.patch('/:id', validate('json', patchSchema), async (c) => {
    const id = c.req.param('id');
    const existing = await c.get('container').repos.mediaRepo.findById(id);
    if (!existing) throw new MediaNotFoundError(id);
    await assertMediaAccess(c, existing);
    const body = c.req.valid('json');
    const patch = { ...body } as any;
    if (body.altText !== undefined) {
      patch.hasAltText = Object.values(body.altText).some(v => typeof v === 'string' && v.trim().length > 0);
    }
    const m = await c.get('container').media.update.execute(id, patch);
    return c.json({ media: await enrichMedia(c, m) });
  });

  // ─── GET /media/:id/references ─────────────────────────────────
  app.get('/:id/references', async (c) => {
    const refs = await c.get('container').media.references.execute(c.req.param('id'));
    const dishes = refs.filter(r => r.kind === 'dish').map(r => ({ id: r.refId }));
    const spaces = refs.filter(r => r.kind === 'hero').map(r => ({ id: r.refId }));
    return c.json({ dishes, spaces });
  });

  // ─── DELETE /media/:id ─────────────────────────────────────────
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await c.get('container').repos.mediaRepo.findById(id);
    if (!existing) throw new MediaNotFoundError(id);
    await assertMediaAccess(c, existing);
    await c.get('container').media.delete.execute(id);
    return c.json({ ok: true });
  });

  return app;
}

async function enrichMedia(c: Context<AppBindings>, m: MediaAsset) {
  const restaurant = m.restaurantId
    ? await c.get('container').repos.restaurantsRepo.findById(m.restaurantId)
    : null;
  return mediaToDto(m, c.env.R2_PUBLIC_URL, restaurant);
}

/** `null` = admin sin restricción (análogo a `allowedSpaceIds`, pero por restaurant). */
async function allowedRestaurantIds(c: Context<AppBindings>): Promise<Set<string> | null> {
  const user = c.get('user')!;
  if (user.role === 'admin') return null;
  const ids = await c.get('container').repos.usersRepo.listRestaurantIds(user.id);
  return new Set(ids);
}

async function assertRestaurantAccess(c: Context<AppBindings>, slug: string): Promise<string> {
  const r = await c.get('container').repos.restaurantsRepo.findBySlug(slug);
  if (!r) throw new RestaurantNotFoundError(slug);
  const allowed = await allowedRestaurantIds(c);
  if (allowed && !allowed.has(r.id)) throw new HTTPException(403, { message: 'RESTAURANT_FORBIDDEN' });
  return r.id;
}

/** Para un asset ya persistido: si no tiene restaurant (huérfano por SET NULL), pasa libre. */
async function assertMediaAccess(c: Context<AppBindings>, m: MediaAsset): Promise<void> {
  if (!m.restaurantId) return;
  const allowed = await allowedRestaurantIds(c);
  if (allowed && !allowed.has(m.restaurantId)) {
    throw new HTTPException(403, { message: 'RESTAURANT_FORBIDDEN' });
  }
}

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
