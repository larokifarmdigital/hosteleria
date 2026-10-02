import { createHash, randomBytes } from 'node:crypto';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { userTokens } from '../db/schema/auth.js';
import type { Env } from '../env.js';

/**
 * Flow de tokens de un solo uso (welcome + password reset).
 *
 * El token REAL (que viaja en el email) se genera random (32 bytes base64url).
 * En BD guardamos SHA-256 del token → si alguien dumpa la tabla, no puede
 * usar tokens activos sin fuerza bruta sobre SHA-256.
 */

export type TokenKind = 'password_setup' | 'password_reset';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Genera un token nuevo, lo guarda hasheado y devuelve el token en claro
 * (único momento en que existe sin hashear — hay que ponerlo en el email).
 */
export async function createToken(env: Env, opts: {
  userId: string;
  kind: TokenKind;
  ttlSeconds: number;
}): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000);

  const db = getDb(env.DATABASE_URL);
  await db.insert(userTokens).values({
    userId: opts.userId,
    kind: opts.kind,
    tokenHash,
    expiresAt
  });

  return token;
}

/**
 * Valida un token: debe existir, no estar usado, no haber expirado y
 * coincidir con la kind esperada. Si todo OK, devuelve el userId y marca
 * el token como usado (atomico).
 *
 * Devuelve `null` si el token es inválido — no revela el motivo exacto
 * (no filtra "expirado" vs "no existe") para dificultar enumeration.
 */
export async function consumeToken(env: Env, token: string, expectedKind: TokenKind): Promise<string | null> {
  const tokenHash = hashToken(token);
  const db = getDb(env.DATABASE_URL);
  const now = new Date();

  return db.transaction(async (tx) => {
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

/**
 * Invalida todos los tokens activos de un tipo para un usuario.
 * Útil al cambiar password: invalidar todos los password_reset pendientes.
 */
export async function invalidateUserTokens(env: Env, userId: string, kind: TokenKind) {
  const db = getDb(env.DATABASE_URL);
  await db
    .update(userTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(userTokens.userId, userId), eq(userTokens.kind, kind), isNull(userTokens.usedAt)));
}
