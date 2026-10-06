import { DomainError } from './errors.js';

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

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly status = 404;
  constructor(_idOrEmail: string) {
    super('El usuario no existe.');
    this.name = 'UserNotFoundError';
  }
}
export class EmailTakenError extends DomainError {
  readonly code = 'EMAIL_TAKEN';
  readonly status = 409;
  constructor(email: string) {
    super(`El email «${email}» ya está registrado.`);
    this.name = 'EmailTakenError';
  }
}
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly status = 401;
  constructor() {
    super('Email o contraseña incorrectos.');
    this.name = 'InvalidCredentialsError';
  }
}
/** `message` viene de zxcvbn — ya en español y listo para la UI. */
export class WeakPasswordError extends DomainError {
  readonly code = 'WEAK_PASSWORD';
  readonly status = 400;
  constructor(reason: string) {
    super(reason);
    this.name = 'WeakPasswordError';
  }
}
