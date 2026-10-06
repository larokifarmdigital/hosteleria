import type { Session, SessionMetadata } from '../models/session.js';
import type { SessionUser } from '../models/user.js';

/**
 * Puerto de sesión — abstracción sobre Lucia (o cualquier otra lib de
 * sesiones). El adapter en `infrastructure/auth/` hace el bridge con la
 * API de Lucia (cookie serialize, invalidateSession, etc.).
 *
 * Devolvemos `cookieHeader` (string listo para `Set-Cookie`) en vez de un
 * objeto Lucia-específico para no filtrar la lib hacia el use case.
 */
export interface SessionRepository {
  /**
   * Valida un sessionId leído de la cookie. Devuelve `null` si expiró o
   * no existe. Si Lucia emitió una cookie refrescada, viene en `cookieHeader`.
   */
  validate(sessionId: string | null): Promise<{
    user: SessionUser;
    session: Session;
    /** Si no es null, el middleware debería hacer `c.header('Set-Cookie', ...)`. */
    cookieHeader: string | null;
  } | null>;

  /** Crea una sesión nueva para un user y devuelve el header Set-Cookie listo. */
  create(userId: string): Promise<{
    session: Session;
    cookieHeader: string;
  }>;

  /** Enriquece la sesión con user agent + hash de IP (post-login). */
  enrichMetadata(sessionId: string, metadata: SessionMetadata): Promise<void>;

  /** Invalida UNA sesión por id. */
  invalidate(sessionId: string): Promise<void>;

  /** Invalida TODAS las sesiones de un user (tras reset de password). */
  invalidateUser(userId: string): Promise<void>;

  /** Lista sesiones activas del user — para `GET /auth/sessions`. */
  listByUser(userId: string): Promise<Session[]>;

  /** Devuelve el header Set-Cookie que borra la cookie del browser. */
  blankCookieHeader(): string;
}
