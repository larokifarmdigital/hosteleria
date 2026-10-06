import type { Session, SessionMetadata } from '../models/session.js';
import type { SessionUser } from '../models/user.js';

/**
 * El puerto devuelve `cookieHeader` como string listo para `Set-Cookie`:
 * así ni el use case ni la ruta importan tipos de Lucia (p.ej. su
 * `createSessionCookie().serialize()` queda encapsulado en el adapter).
 */
export interface SessionRepository {
  /**
   * `cookieHeader` viene no-null solo cuando Lucia refrescó la cookie
   * (fresh session). En ese caso el middleware debe reemitirla.
   */
  validate(sessionId: string | null): Promise<{
    user: SessionUser;
    session: Session;
    cookieHeader: string | null;
  } | null>;

  create(userId: string): Promise<{
    session: Session;
    cookieHeader: string;
  }>;

  /** Rellena `userAgent` + `ipHash` tras un login OK. */
  enrichMetadata(sessionId: string, metadata: SessionMetadata): Promise<void>;

  invalidate(sessionId: string): Promise<void>;

  /** Invalida todas las sesiones del user — tras un reset de password. */
  invalidateUser(userId: string): Promise<void>;

  listByUser(userId: string): Promise<Session[]>;

  /** Set-Cookie que borra la cookie del browser (expires=0). */
  blankCookieHeader(): string;
}
