import { createHash, randomBytes } from 'node:crypto';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { getDb } from './client.js';
import { userTokens } from './schema/auth.js';
import type { Env } from '../../../env.js';
import type { TokenGenerator, TokenKind } from '../../../domain/services/tokenGenerator.js';

/**
 * Token = 32 bytes random en base64url; en BD solo su SHA-256. `consume`
 * marca `usedAt` dentro de la misma transaction en la que valida, para
 * cerrar la ventana de doble-uso bajo requests simultáneos.
 */
export class DrizzleTokenGenerator implements TokenGenerator {
  constructor(private env: Env) {}
  private get db() { return getDb(this.env.DATABASE_URL); }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(input: { userId: string; kind: TokenKind; ttlSeconds: number }): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);

    await this.db.insert(userTokens).values({
      userId: input.userId,
      kind: input.kind,
      tokenHash,
      expiresAt
    });

    return token;
  }

  async consume(token: string, expectedKind: TokenKind): Promise<string | null> {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    return this.db.transaction(async (tx) => {
      const row = await tx.query.userTokens.findFirst({
        where: and(
          eq(userTokens.tokenHash, tokenHash),
          eq(userTokens.kind, expectedKind),
          isNull(userTokens.usedAt),
          gte(userTokens.expiresAt, now)
        )
      });
      if (!row) return null;

      await tx.update(userTokens).set({ usedAt: now }).where(eq(userTokens.id, row.id));
      return row.userId;
    });
  }

  async invalidateAll(userId: string, kind: TokenKind): Promise<void> {
    await this.db
      .update(userTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(userTokens.userId, userId), eq(userTokens.kind, kind), isNull(userTokens.usedAt)));
  }
}
