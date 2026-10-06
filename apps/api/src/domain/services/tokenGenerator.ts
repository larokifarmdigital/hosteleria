/**
 * Tokens de un solo uso para flows por email. En BD guardamos solo su
 * SHA-256; el token en claro existe en memoria lo justo para meterlo en
 * el email, luego es irrecuperable.
 */
import { DomainError } from '../models/errors.js';

export type TokenKind = 'password_setup' | 'password_reset';

export class InvalidTokenError extends DomainError {
  readonly code = 'INVALID_OR_EXPIRED_TOKEN';
  readonly status = 400;
  constructor() {
    super('El enlace no es válido o ha caducado. Pide uno nuevo.');
    this.name = 'InvalidTokenError';
  }
}

export interface TokenGenerator {
  /** Devuelve el token EN CLARO — único momento sin hashear. */
  create(input: {
    userId: string;
    kind: TokenKind;
    ttlSeconds: number;
  }): Promise<string>;

  /**
   * Marca el token como usado atómicamente y devuelve `userId`, o `null`
   * si no existe/expiró/ya se usó/kind no coincide. No distinguimos entre
   * motivos para dificultar enumeración.
   */
  consume(token: string, expectedKind: TokenKind): Promise<string | null>;

  /** Al emitir un nuevo reset, invalida los previos — solo el último sirve. */
  invalidateAll(userId: string, kind: TokenKind): Promise<void>;
}
