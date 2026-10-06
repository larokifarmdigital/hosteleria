import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../../auth/middleware.js';
import { userToDto } from '../dto/userDto.js';
import type { AppBindings } from '../types.js';

/**
 * Rutas thin de users (admin only — gestión del team).
 *
 * Para el DTO necesitamos los slugs de los restaurantes asignados al editor;
 * los pedimos vía repos.restaurantsRepo.findById de cada id devuelto por
 * `listRestaurantIds`.
 */
export function createUsersRoutes() {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);
  app.use('*', requireAdmin);

  // ─── GET / ─────────────────────────────────────────────────────
  app.get('/', async (c) => {
    const list = await c.get('container').users.list.execute();
    const dtos = await Promise.all(list.map(async ({ user, restaurantIds }) => {
      const slugs = await resolveSlugs(c, restaurantIds);
      return userToDto(user, slugs);
    }));
    return c.json({ users: dtos });
  });

  // ─── POST / ────────────────────────────────────────────────────
  app.post('/', zValidator('json', createSchema), async (c) => {
    const inviter = c.get('user')!;
    const user = await c.get('container').users.create.execute(c.req.valid('json'), inviter.name);
    const slugs = user.role === 'editor'
      ? await resolveSlugs(c, await c.get('container').repos.usersRepo.listRestaurantIds(user.id))
      : [];
    return c.json({ user: userToDto(user, slugs) }, 201);
  });

  // ─── PATCH /:id ────────────────────────────────────────────────
  app.patch('/:id', zValidator('json', patchSchema), async (c) => {
    const id = c.req.param('id');
    const user = await c.get('container').users.update.execute(id, c.req.valid('json'));
    const slugs = user.role === 'editor'
      ? await resolveSlugs(c, await c.get('container').repos.usersRepo.listRestaurantIds(id))
      : [];
    return c.json({ user: userToDto(user, slugs) });
  });

  // ─── DELETE /:id ───────────────────────────────────────────────
  app.delete('/:id', async (c) => {
    const actor = c.get('user')!;
    const id = c.req.param('id');
    await c.get('container').users.delete.execute(id, actor.id);
    return c.json({ ok: true });
  });

  return app;
}

async function resolveSlugs(c: any, restaurantIds: string[]): Promise<string[]> {
  if (restaurantIds.length === 0) return [];
  const repo = c.get('container').repos.restaurantsRepo;
  const found = await Promise.all(restaurantIds.map((id: string) => repo.findById(id)));
  return found.filter((r: any): r is NonNullable<typeof r> => !!r).map((r: any) => r.slug);
}

// ═══════════════════════════════════════════════════════════════════
// Zod schemas
// ═══════════════════════════════════════════════════════════════════

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(120),
  role: z.enum(['admin', 'editor']).default('editor'),
  avatarColor: z.string().default('#b4593b'),
  restaurantSlugs: z.array(z.string()).default([])
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['admin', 'editor']).optional(),
  avatarColor: z.string().optional(),
  restaurantSlugs: z.array(z.string()).optional(),
  password: z.string().min(8).optional()
}).partial();
