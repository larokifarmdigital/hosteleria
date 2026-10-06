import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { getDb } from '../db/client.js';
import { users } from '../db/schema/auth.js';
import { getLucia } from './lucia.js';
import { hashPassword } from './password-hash.js';
import { checkPasswordStrength } from './password-strength.js';
import { createToken, consumeToken, invalidateUserTokens, type TokenKind } from './session-tokens.js';
import { getEmailProvider } from '../email/provider.js';
import { passwordResetTemplate } from '../email/templates.js';
import type { Env } from '../env.js';

/**
 * Flows asíncronos de password: "olvidé mi contraseña" (reset) + "primera
 * password al activar cuenta" (setup, enviado via welcome email).
 *
 * Mantenido fuera de `route.ts` para que los handlers queden thin: solo
 * parsean body y llaman al service.
 */

/**
 * **POST /auth/forgot** — idempotente, siempre OK (no revelamos si el email existe).
 *
 * Si existe: invalida tokens previos, crea uno nuevo, envía email con el link.
 * Si no existe: silencio (fire-and-forget en logs si querés debug).
 */
export async function requestPasswordReset(env: Env, email: string): Promise<void> {
  const db = getDb(env.DATABASE_URL);
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user) return;

  await invalidateUserTokens(env, user.id, 'password_reset');
  const token = await createToken(env, {
    userId: user.id,
    kind: 'password_reset',
    ttlSeconds: 60 * 60 // 1h
  });
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  const tpl = passwordResetTemplate({ name: user.name, resetUrl });
  void getEmailProvider(env)
    .send({ to: user.email, ...tpl })
    .catch(err => console.error('[auth] forgot email failed:', err));
}

/**
 * **POST /auth/reset** y **POST /auth/set-password** — comparten lógica.
 * Consume el token (si válido, lo marca como usado + devuelve userId),
 * valida la fuerza del password nuevo, lo hashea, y lo guarda.
 *
 * Si `kind === 'password_reset'`, además invalida TODAS las sesiones activas
 * del user (seguridad: tras un reset, cerrar sesiones existentes).
 *
 * Lanza `HTTPException(400)` si el token es inválido o el password es débil.
 */
export async function applyPasswordChange(
  env: Env,
  input: { token: string; newPassword: string; kind: TokenKind }
): Promise<void> {
  const userId = await consumeToken(env, input.token, input.kind);
  if (!userId) throw new HTTPException(400, { message: 'invalid_or_expired_token' });

  const db = getDb(env.DATABASE_URL);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  const check = checkPasswordStrength({
    password: input.newPassword,
    userInputs: user ? [user.email, user.name] : []
  });
  if (!check.ok) throw new HTTPException(400, { message: check.reason ?? 'weak_password' });

  const passwordHash = await hashPassword(input.newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  // En reset invalidamos sesiones activas; en setup no hay sesiones todavía.
  if (input.kind === 'password_reset') {
    const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
    await lucia.invalidateUserSessions(userId);
  }
}
