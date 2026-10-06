/**
 * Puerto para tokens de un solo uso (welcome y reset de password).
 *
 * El token REAL (random) se envía por email al usuario. En BD solo se
 * guarda su SHA-256 — si alguien dumpea la tabla, no puede usar tokens
 * activos sin crackearlos. La impl concreta genera + hashea + persiste.
 */

export type TokenKind = 'password_setup' | 'password_reset';

export interface TokenGenerator {
  /**
   * Genera un token, guarda su hash en BD y devuelve el token en claro
   * (único momento en que existe sin hashear — ponerlo en el email).
   */
  create(input: {
    userId: string;
    kind: TokenKind;
    ttlSeconds: number;
  }): Promise<string>;

  /**
   * Valida y "consume" un token. Si válido devuelve el `userId`.
   * Si inválido (no existe, usado, expirado, o kind no coincide) → `null`.
   * Atómico: marca `usedAt` para no permitir re-uso.
   */
  consume(token: string, expectedKind: TokenKind): Promise<string | null>;

  /**
   * Invalida todos los tokens activos de un tipo para un usuario.
   * Útil al generar un nuevo reset: deja solo el último válido.
   */
  invalidateAll(userId: string, kind: TokenKind): Promise<void>;
}
