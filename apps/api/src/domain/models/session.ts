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

export class SessionNotFoundError extends Error {
  constructor(id: string) { super(`session_not_found:${id}`); this.name = 'SessionNotFoundError'; }
}
