export type UserRole = 'admin' | 'editor';

export interface User {
  readonly id: string;
  readonly email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  readonly createdAt: Date;
  lastAccessAt: Date | null;
}

/** User sin `passwordHash` — lo que viaja al cliente. */
export interface SessionUser {
  readonly id: string;
  readonly email: string;
  name: string;
  role: UserRole;
  avatarColor: string;
}

export function toSessionUser(u: User): SessionUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, avatarColor: u.avatarColor };
}

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
