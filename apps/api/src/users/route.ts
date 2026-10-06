/**
 * Rutas HTTP de usuarios del backoffice (admin only — gestión del team).
 *
 * **Endpoints**:
 *  - `GET  /users`      — listado con rol + restaurantes asignados
 *  - `POST /users`      — crear (si no se pasa password, se manda welcome email con setup link)
 *  - `PATCH /users/:id` — editar nombre/rol/color/restaurantes/password
 *  - `DELETE /users/:id`— borrar (cascade a sessions y user_restaurants)
 *
 * Todos requieren `requireAdmin`. Para que un editor edite SU propio perfil
 * (sin tocar rol/restaurantes), ver endpoint separado en `src/auth/route.ts`.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, asc, and, inArray } from 'drizzle-orm';
import { hashPassword } from '../auth/password-hash.js';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { users, userRestaurants } from '../infrastructure/persistence/drizzle/schema/auth.js';
import { restaurants } from '../infrastructure/persistence/drizzle/schema/content.js';
import { requireAuth, requireAdmin, type AuthVars } from '../auth/middleware.js';
import { createToken } from '../auth/session-tokens.js';
import { getEmailProvider } from '../email/provider.js';
import { welcomeTemplate } from '../email/templates.js';
import { checkPasswordStrength } from '../auth/password-strength.js';

const createSchema = z.object({
  email: z.string().email(),
  /**
   * Password opcional: si no se da, se envía email con enlace de setup
   * (preferido para invitar editores — ellos eligen su propio password).
   * Si se da (ej. seed script), el usuario puede loguearse directamente.
   */
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}

async function toDto(env: any, userId: string) {
  const db = getDb(env.DATABASE_URL);
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return null;
  let restaurantSlugs: string[] = [];
  if (u.role === 'editor') {
    const rows = await db
      .select({ slug: restaurants.slug })
      .from(userRestaurants)
      .innerJoin(restaurants, eq(restaurants.id, userRestaurants.restaurantId))
      .where(eq(userRestaurants.userId, u.id));
    restaurantSlugs = rows.map(r => r.slug);
  }
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    initials: initialsOf(u.name),
    avatarColor: u.avatarColor,
    role: u.role,
    restaurants: u.role === 'admin' ? ['*'] : restaurantSlugs,
    lastAccessAt: u.lastAccessAt?.toISOString() ?? null
  };
}

export function createUsersRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();

  app.use('*', requireAuth);
  app.use('*', requireAdmin);

  // ─── GET / ─────────────────────────────────────────────────────
  app.get('/', async (c) => {
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const rows = await db.query.users.findMany({ orderBy: [asc(users.name)] });
    const dtos = await Promise.all(rows.map(u => toDto(env, u.id)));
    return c.json({ users: dtos });
  });

  // ─── POST / ────────────────────────────────────────────────────
  app.post('/', zValidator('json', createSchema), async (c) => {
    const env = c.get('env');
    const inviter = c.get('user')!;
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);

    const existing = await db.query.users.findFirst({ where: eq(users.email, body.email.toLowerCase()) });
    if (existing) throw new HTTPException(409, { message: 'email_taken' });

    // Si viene password explícita, validar fortaleza antes de hashear.
    if (body.password) {
      const check = checkPasswordStrength({
        password: body.password,
        userInputs: [body.email, body.name]
      });
      if (!check.ok) throw new HTTPException(400, { message: check.reason ?? 'weak_password' });
    }

    // Si no se da password, se genera uno placeholder bloqueado (hash largo
    // imposible de crackear). El usuario setea el real via welcome email.
    const passwordHash = body.password
      ? await hashPassword(body.password)
      : await hashPassword(crypto.randomUUID() + crypto.randomUUID());

    const u = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        role: body.role,
        avatarColor: body.avatarColor
      }).returning({ id: users.id });

      if (body.role === 'editor' && body.restaurantSlugs.length > 0) {
        const rs = await tx.query.restaurants.findMany({
          where: inArray(restaurants.slug, body.restaurantSlugs)
        });
        if (rs.length > 0) {
          await tx.insert(userRestaurants).values(rs.map(r => ({ userId: created.id, restaurantId: r.id })));
        }
      }
      return created;
    });

    // Si no se dio password, enviar welcome email con link de setup (48h).
    if (!body.password) {
      const token = await createToken(env, { userId: u.id, kind: 'password_setup', ttlSeconds: 60 * 60 * 48 });
      const setupUrl = `${env.APP_URL}/set-password?token=${token}`;
      const tpl = welcomeTemplate({ name: body.name, setupUrl, invitedBy: inviter.name });
      // Fire-and-forget: no bloqueamos la respuesta si el email falla.
      void getEmailProvider(env).send({ to: body.email, ...tpl })
        .catch(err => console.error('[users] welcome email failed:', err));
    }

    const dto = await toDto(env, u.id);
    return c.json({ user: dto }, 201);
  });

  // ─── PATCH /:id ────────────────────────────────────────────────
  app.patch('/:id', zValidator('json', patchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);

    const u = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!u) throw new HTTPException(404, { message: 'not_found' });

    const updates: Partial<typeof users.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.role !== undefined) updates.role = body.role;
    if (body.avatarColor !== undefined) updates.avatarColor = body.avatarColor;
    if (body.password !== undefined) {
      const check = checkPasswordStrength({
        password: body.password,
        userInputs: [u.email, body.name ?? u.name]
      });
      if (!check.ok) throw new HTTPException(400, { message: check.reason ?? 'weak_password' });
      updates.passwordHash = await hashPassword(body.password);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, id));
    }

    // Reset restaurantSlugs si viene, o si role pasa a admin (vaciar m2m).
    const finalRole = body.role ?? u.role;
    if (body.restaurantSlugs !== undefined || (body.role === 'admin')) {
      await db.delete(userRestaurants).where(eq(userRestaurants.userId, id));
      if (finalRole === 'editor' && body.restaurantSlugs && body.restaurantSlugs.length > 0) {
        const rs = await db.query.restaurants.findMany({
          where: inArray(restaurants.slug, body.restaurantSlugs)
        });
        if (rs.length > 0) {
          await db.insert(userRestaurants).values(rs.map(r => ({ userId: id, restaurantId: r.id })));
        }
      }
    }

    const dto = await toDto(env, id);
    return c.json({ user: dto });
  });

  // ─── DELETE /:id ───────────────────────────────────────────────
  app.delete('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const user = c.get('user')!;
    if (user.id === id) throw new HTTPException(400, { message: 'cannot_delete_self' });
    const db = getDb(env.DATABASE_URL);
    const u = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!u) throw new HTTPException(404, { message: 'not_found' });
    await db.delete(users).where(eq(users.id, id));
    return c.json({ ok: true });
  });

  return app;
}
