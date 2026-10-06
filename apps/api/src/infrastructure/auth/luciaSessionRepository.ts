import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { eq, asc, gte } from 'drizzle-orm';
import { getDb } from '../persistence/drizzle/client.js';
import { users, sessions } from '../persistence/drizzle/schema/auth.js';
import { rowToSession } from '../persistence/drizzle/mappers/sessionMapper.js';
import { toSessionUser } from '../../domain/models/user.js';
import type { Session, SessionMetadata } from '../../domain/models/session.js';
import type { SessionUser } from '../../domain/models/user.js';
import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import type { Env } from '../../env.js';

// Cacheado por isolate: Lucia abre un pool contra la BD y no vale la pena
// reconstruirlo por request.
let _lucia: Lucia | null = null;

function getLucia(env: Env) {
  if (_lucia) return _lucia;
  const production = env.SENTRY_ENV === 'production';
  const db = getDb(env.DATABASE_URL) as any;
  const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
  _lucia = new Lucia(adapter, {
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
  return _lucia;
}

export class LuciaSessionRepository implements SessionRepository {
  constructor(private env: Env) {}
  private get lucia() { return getLucia(this.env); }
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

    // Lucia solo nos da id/userId/expiresAt; completamos la entidad del
    // dominio releyendo la fila (createdAt + userAgent + ipHash).
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
        lastAccessAt: null
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
