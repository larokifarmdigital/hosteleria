import { createHash, randomBytes } from 'node:crypto';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { userTokens } from '../infrastructure/persistence/drizzle/schema/auth.js';
import type { Env } from '../env.js';

/**
 * Tokens de un solo uso para flows por email (bienvenida y reset de password).
 *
 * **Cómo viaja el token**: el token REAL (32 bytes random en base64url) se
 * genera en el servidor y se envía por email al usuario. En la BD solo
 * guardamos el **SHA-256** del token. Si alguien dumpea la tabla no puede
 * usar tokens activos — tendría que crackearlos.
 *
 * **Cuándo se usan**:
 *  - `password_setup`: cuando admin crea un user sin password → se le manda
 *    un email con un link para elegir el password inicial.
 *  - `password_reset`: cuando el user hace "olvidé mi contraseña".
 */

export type TokenKind = 'password_setup' | 'password_reset';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Genera un token nuevo, guarda su hash en BD y devuelve el token en claro.
 * Este es el ÚNICO momento en que el token existe sin hashear — hay que
 * ponerlo en el email que recibe el usuario.
 *
 * Dónde se usa:
 *  - `routes/users.ts` → POST /users (admin crea user sin password) → genera
 *    token `password_setup` con TTL 48h.
 *  - `routes/auth.ts` → POST /auth/forgot → genera token `password_reset`
 *    con TTL 1h.
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
 * Valida un token y lo "consume" (marca `usedAt`) de forma atómica.
 * Devuelve el `userId` si todo OK, o `null` si el token es inválido
 * (no existe, ya usado, expirado, o kind no coincide).
 *
 * No reveamos el motivo exacto de la invalidez para dificultar enumeración.
 *
 * Dónde se usa:
 *  - `routes/auth.ts` → POST /auth/reset (consume `password_reset`).
 *  - `routes/auth.ts` → POST /auth/set-password (consume `password_setup`).
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
 * Marca TODOS los tokens activos de un tipo para un usuario como "usados".
 *
 * Dónde se usa:
 *  - `routes/auth.ts` → POST /auth/forgot (antes de generar un nuevo
 *    token de reset, invalida los previos — así solo el último sirve).
 */
export async function invalidateUserTokens(env: Env, userId: string, kind: TokenKind) {
  const db = getDb(env.DATABASE_URL);
  await db
    .update(userTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(userTokens.userId, userId), eq(userTokens.kind, kind), isNull(userTokens.usedAt)));
}
