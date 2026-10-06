import { DomainError } from './errors.js';

export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly userAgent: string | null;
  readonly ipHash: string | null;    // SHA-256 truncado por GDPR — no IP cruda.
}

export interface SessionMetadata {
  userAgent: string | null;
  ipHash: string;
}

export class SessionNotFoundError extends DomainError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('La sesión no existe o ya fue cerrada.');
    this.name = 'SessionNotFoundError';
  }
}
