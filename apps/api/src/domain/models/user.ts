/**
 * Entidad `User` — cuenta del backoffice.
 *
 * `admin` ve todo (gestiona idiomas y usuarios).
 * `editor` solo ve los restaurantes asignados en `user_restaurants` (m2m).
 */

export type UserRole = 'admin' | 'editor';

export interface User {
  readonly id: string;
  readonly email: string;
  passwordHash: string;      // formato `$scrypt$N=...$salt$hash`
  name: string;
  role: UserRole;
  avatarColor: string;
  readonly createdAt: Date;
  lastAccessAt: Date | null;
}

/**
 * Shape serializable del user en la sesión actual — SIN passwordHash.
 * Lo que devolvemos al cliente en `/auth/login` y `/auth/session`.
 */
export interface SessionUser {
  readonly id: string;
  readonly email: string;
  name: string;
  role: UserRole;
  avatarColor: string;
}

/** Convierte un User completo al shape público (sin passwordHash). */
export function toSessionUser(u: User): SessionUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, avatarColor: u.avatarColor };
}

// ─── Domain errors ───────────────────────────────────────────────
export class UserNotFoundError extends Error {
  constructor(idOrEmail: string) { super(`user_not_found:${idOrEmail}`); this.name = 'UserNotFoundError'; }
}
export class EmailTakenError extends Error {
  constructor(email: string) { super(`email_taken:${email}`); this.name = 'EmailTakenError'; }
}
export class InvalidCredentialsError extends Error {
  constructor() { super('invalid_credentials'); this.name = 'InvalidCredentialsError'; }
}
export class WeakPasswordError extends Error {
  constructor(reason: string) { super(reason); this.name = 'WeakPasswordError'; }
}
