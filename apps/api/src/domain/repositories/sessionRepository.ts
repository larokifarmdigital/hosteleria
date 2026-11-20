import type { Session, SessionMetadata } from '../models/session.js';
import type { SessionUser } from '../models/user.js';

/** `cookieHeader` va ya serializado para `Set-Cookie`: así nada fuera del
 *  adapter importa tipos de Lucia. */
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

  enrichMetadata(sessionId: string, metadata: SessionMetadata): Promise<void>;

  invalidate(sessionId: string): Promise<void>;

  /** Invalida todas las sesiones del user — tras un reset de password. */
  invalidateUser(userId: string): Promise<void>;

  listByUser(userId: string): Promise<Session[]>;

  /** Set-Cookie que borra la cookie del browser (expires=0). */
  blankCookieHeader(): string;
}
