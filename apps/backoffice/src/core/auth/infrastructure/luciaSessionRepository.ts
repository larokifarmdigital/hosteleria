import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { eq, asc, gte } from 'drizzle-orm';
import { getDb, type Env } from '@/core/shared';
import { users, sessions } from '@/core/shared/infrastructure/drizzle/schema';
import { rowToSession } from './sessionMapper';
import { toSessionUser } from '../domain/models/user';
import type { Session, SessionMetadata } from '../domain/models/session';
import type { SessionUser } from '../domain/models/user';
import type { SessionRepository } from '../domain/repositories/sessionRepository';

// Nombre y atributos de la cookie no se tocan: cambiarlos cierra las sesiones abiertas.
function buildLucia(env: Env): Lucia {
  const production = env.APP_ENV === 'production';
  const db = getDb(env.DATABASE_URL) as any;
  const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
  return new Lucia(adapter, {
    sessionCookie: {
      name: 'hs_session',
      expires: false, // rolling — Lucia refresca cuando faltan < N días
      attributes: {
        secure: production,
        sameSite: production ? 'none' : 'lax', // 'none' requiere Secure
        domain: env.COOKIE_DOMAIN || undefined
      }
    },
    getUserAttributes: (attrs) => ({
      email: attrs.email,
      name: attrs.name,
      role: attrs.role,
      avatarColor: attrs.avatarColor
    })
  });
}

export class LuciaSessionRepository implements SessionRepository {
  constructor(private env: Env) {}
  private _lucia: Lucia | null = null;
  private get lucia() { return (this._lucia ??= buildLucia(this.env)); }
  private get db() { return getDb(this.env.DATABASE_URL); }

  async validate(sessionId: string | null): Promise<{
    user: SessionUser;
    session: Session;
    cookieHeader: string | null;
  } | null> {
    if (!sessionId) return null;
    const { session, user } = await this.lucia.validateSession(sessionId);
    if (!session || !user) return null;

    let cookieHeader: string | null = null;
    if (session.fresh) {
      cookieHeader = this.lucia.createSessionCookie(session.id).serialize();
    }

    // Lucia solo da id/userId/expiresAt: releemos la fila para el resto.
    const row = await this.db.query.sessions.findFirst({ where: eq(sessions.id, session.id) });
    const domainSession: Session = row ? rowToSession(row) : {
      id: session.id,
      userId: session.userId,
      createdAt: new Date(),
      expiresAt: session.expiresAt,
      userAgent: null,
      ipHash: null
    };

    return {
      user: toSessionUser({
        id: user.id,
        email: (user as any).email,
        name: (user as any).name,
        role: (user as any).role,
        avatarColor: (user as any).avatarColor,
        passwordHash: '',
        createdAt: new Date(),
        lastAccessAt: null,
        suspendedAt: null
      }),
      session: domainSession,
      cookieHeader
    };
  }

  async create(userId: string): Promise<{ session: Session; cookieHeader: string }> {
    const luciaSession = await this.lucia.createSession(userId, {});
    const cookieHeader = this.lucia.createSessionCookie(luciaSession.id).serialize();

    const row = await this.db.query.sessions.findFirst({ where: eq(sessions.id, luciaSession.id) });
    const session: Session = row ? rowToSession(row) : {
      id: luciaSession.id,
      userId,
      createdAt: new Date(),
      expiresAt: luciaSession.expiresAt,
      userAgent: null,
      ipHash: null
    };

    return { session, cookieHeader };
  }

  async enrichMetadata(sessionId: string, metadata: SessionMetadata): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        userAgent: metadata.userAgent?.slice(0, 500) ?? null,
        ipHash: metadata.ipHash
      })
      .where(eq(sessions.id, sessionId));
  }

  async invalidate(sessionId: string): Promise<void> {
    await this.lucia.invalidateSession(sessionId);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.lucia.invalidateUserSessions(userId);
  }

  async listByUser(userId: string): Promise<Session[]> {
    const now = new Date();
    const rows = await this.db.query.sessions.findMany({
      where: (s, { and }) => and(eq(s.userId, userId), gte(s.expiresAt, now)),
      orderBy: [asc(sessions.createdAt)]
    });
    return rows.map(rowToSession);
  }

  blankCookieHeader(): string {
    return this.lucia.createBlankSessionCookie().serialize();
  }
}
