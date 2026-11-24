import { describe, it, expect } from 'vitest';
import { UpdateUserUseCase, InviteUserUseCase, CreateUserUseCase } from '@/core/users';
import { LoginUseCase, ApplyPasswordChangeUseCase } from '@/core/auth';
import {
  InvalidTokenError,
  WeakPasswordError,
  AccountSuspendedError,
  CannotLockSelfOutError,
  InvalidCredentialsError,
  type User
} from '@/core/auth/domain';

function world() {
  const users = new Map<string, User>();
  const add = (id: string, over: Partial<User> = {}) => users.set(id, {
    id, email: `${id}@x.com`, passwordHash: 'hash:buena', name: id, role: 'editor', avatarColor: '#000',
    createdAt: new Date(), lastAccessAt: null, suspendedAt: null, ...over
  });
  add('admin', { role: 'admin' });
  add('ana');
  const log: string[] = [];
  const usersRepo = {
    findById: async (id: string) => users.get(id) ?? null,
    findByEmail: async (email: string) => [...users.values()].find(u => u.email === email) ?? null,
    update: async (id: string, patch: Partial<User>) => { users.set(id, { ...users.get(id)!, ...patch }); },
    setSuspended: async (id: string, at: Date | null) => { users.set(id, { ...users.get(id)!, suspendedAt: at }); },
    setRestaurants: async (id: string, ids: string[]) => { log.push(`restaurants:${id}:${ids.join(',')}`); },
    updatePasswordHash: async () => {},
    touchLastAccess: async () => {},
    create: async (input: Partial<User>) => { add('nuevo', input); return users.get('nuevo')!; }
  };
  const sessions = {
    invalidateUser: async (id: string) => { log.push(`sessions:${id}`); },
    create: async (id: string) => ({ session: { id: 's1' }, cookieHeader: `c=${id}` }),
    enrichMetadata: async () => {}
  };
  const hasher = { dummyHash: 'hash:nada', verify: async (pw: string, hash: string) => hash === `hash:${pw}`, hash: async (pw: string) => `hash:${pw}` };
  const tokens = {
    n: 0,
    invalidateAll: async (id: string, kind: string) => { log.push(`invalidate:${id}:${kind}`); },
    create: async (input: { userId: string; kind: string }) => { log.push(`token:${input.userId}:${input.kind}`); return `tok-${++tokens.n}`; },
    consume: async () => null
  };
  const sent: { to: string; text: string }[] = [];
  const email = { send: async (m: { to: string; text: string }) => { sent.push(m); } };
  const restaurants = { findBySlug: async () => null };
  return { users, log, sent, usersRepo, sessions, hasher, tokens, email, restaurants };
}

describe('suspender una cuenta', () => {
  it('la marca, cierra sus sesiones y deja de poder entrar', async () => {
    const w = world();
    const update = new UpdateUserUseCase(w.usersRepo as never, w.restaurants as never, w.hasher as never, w.sessions as never);
    const login = new LoginUseCase(w.usersRepo as never, w.sessions as never, w.hasher as never);
    const meta = { ip: '1.1.1.1', userAgent: null };

    expect((await login.execute({ email: 'ana@x.com', password: 'buena' }, meta)).user.id).toBe('ana');
    const after = await update.execute('ana', { suspended: true }, 'admin');
    expect(after.suspendedAt).toBeInstanceOf(Date);
    expect(w.log).toContain('sessions:ana');
    await expect(login.execute({ email: 'ana@x.com', password: 'buena' }, meta)).rejects.toBeInstanceOf(AccountSuspendedError);
    // Con la contraseña mal no se dice que la cuenta existe ni que está suspendida.
    await expect(login.execute({ email: 'ana@x.com', password: 'mala' }, meta)).rejects.toBeInstanceOf(InvalidCredentialsError);

    await update.execute('ana', { suspended: false }, 'admin');
    expect((await login.execute({ email: 'ana@x.com', password: 'buena' }, meta)).user.id).toBe('ana');
  });

  it('repetir el mismo estado no cierra sesiones de nuevo', async () => {
    const w = world();
    const update = new UpdateUserUseCase(w.usersRepo as never, w.restaurants as never, w.hasher as never, w.sessions as never);
    await update.execute('ana', { suspended: false }, 'admin');
    expect(w.log.filter(l => l.startsWith('sessions:'))).toEqual([]);
  });

  it('un administrador no puede suspenderse ni quitarse el rol', async () => {
    const w = world();
    const update = new UpdateUserUseCase(w.usersRepo as never, w.restaurants as never, w.hasher as never, w.sessions as never);
    await expect(update.execute('admin', { suspended: true }, 'admin')).rejects.toBeInstanceOf(CannotLockSelfOutError);
    await expect(update.execute('admin', { role: 'editor' }, 'admin')).rejects.toBeInstanceOf(CannotLockSelfOutError);
    expect((await update.execute('admin', { name: 'Otro nombre' }, 'admin')).name).toBe('Otro nombre');
    expect(w.users.get('admin')!.role).toBe('admin');
  });
});

describe('cambiar la contraseña desde Ajustes', () => {
  it('cierra las sesiones de esa cuenta', async () => {
    const w = world();
    const update = new UpdateUserUseCase(w.usersRepo as never, w.restaurants as never, w.hasher as never, w.sessions as never);
    await update.execute('ana', { password: 'Cuatro-mesas-junto-al-ventanal-82' }, 'admin');
    expect(w.log).toContain('sessions:ana');
  });
});

describe('invitaciones', () => {
  it('el alta sin contraseña devuelve un enlace de un solo uso y lo manda por correo', async () => {
    const w = world();
    const create = new CreateUserUseCase(w.usersRepo as never, w.restaurants as never, w.hasher as never, w.tokens as never, w.email as never, 'https://bo.example');
    const { user, invitation } = await create.execute({ email: 'n@x.com', name: 'Nuria', role: 'editor', avatarColor: '#000', restaurantSlugs: [] }, 'Admin');
    expect(user.email).toBe('n@x.com');
    expect(invitation!.token).toBe('tok-1');
    expect(invitation!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 3600_000);
    expect(w.sent[0].to).toBe('n@x.com');
    expect(w.sent[0].text).toContain('https://bo.example/set-password?token=tok-1');
  });

  it('con contraseña no hay invitación', async () => {
    const w = world();
    const create = new CreateUserUseCase(w.usersRepo as never, w.restaurants as never, w.hasher as never, w.tokens as never, w.email as never, 'https://bo.example');
    const { invitation } = await create.execute({ email: 'n@x.com', name: 'Nuria', password: 'Una-clave-larga-y-rara-93', role: 'editor', avatarColor: '#000', restaurantSlugs: [] }, 'Admin');
    expect(invitation).toBeNull();
    expect(w.sent).toEqual([]);
  });

  it('un enlace nuevo anula los anteriores', async () => {
    const w = world();
    const invite = new InviteUserUseCase(w.usersRepo as never, w.tokens as never, w.email as never, 'https://bo.example');
    const inv = await invite.execute('ana', 'Admin');
    expect(inv.token).toBe('tok-1');
    expect(w.log).toEqual(['invalidate:ana:password_setup', 'token:ana:password_setup']);
  });
});

describe('elegir contraseña con un enlace', () => {
  function setup() {
    const w = world();
    const valid = new Set(['enlace']);
    const tokens = {
      peek: async (t: string) => (valid.has(t) ? 'ana' : null),
      consume: async (t: string) => (valid.delete(t) ? 'ana' : null)
    };
    const saved: string[] = [];
    const usersRepo = { ...w.usersRepo, updatePasswordHash: async (_id: string, hash: string) => { saved.push(hash); } };
    const apply = new ApplyPasswordChangeUseCase(usersRepo as never, w.sessions as never, tokens as never, w.hasher as never);
    return { apply, saved, valid, log: w.log };
  }

  it('elegir contraseña cierra las sesiones que la cuenta tuviera abiertas', async () => {
    const { apply, log } = setup();
    await apply.execute({ token: 'enlace', newPassword: 'Cuatro-mesas-junto-al-ventanal-82', kind: 'password_setup' });
    expect(log).toContain('sessions:ana');
  });

  it('una contraseña floja no gasta el enlace: se puede volver a intentar', async () => {
    const { apply, saved, valid } = setup();
    await expect(apply.execute({ token: 'enlace', newPassword: '12345678', kind: 'password_setup' })).rejects.toBeInstanceOf(WeakPasswordError);
    expect(valid.has('enlace')).toBe(true);
    await apply.execute({ token: 'enlace', newPassword: 'Cuatro-mesas-junto-al-ventanal-82', kind: 'password_setup' });
    expect(saved).toEqual(['hash:Cuatro-mesas-junto-al-ventanal-82']);
  });

  it('el enlace sirve una sola vez', async () => {
    const { apply } = setup();
    await apply.execute({ token: 'enlace', newPassword: 'Cuatro-mesas-junto-al-ventanal-82', kind: 'password_setup' });
    await expect(apply.execute({ token: 'enlace', newPassword: 'Otra-frase-larga-y-distinta-47', kind: 'password_setup' })).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(apply.execute({ token: 'inventado', newPassword: 'Otra-frase-larga-y-distinta-47', kind: 'password_setup' })).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
