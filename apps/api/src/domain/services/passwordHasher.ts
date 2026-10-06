/**
 * Puerto para hashing + verificación de passwords.
 *
 * El dominio define QUÉ necesita (hash y verify); la impl concreta vive
 * en `infrastructure/auth/scryptPasswordHasher.ts` (usa scrypt pure JS vía
 * `@noble/hashes` — compatible con Workers que bloquea WASM dinámico).
 */
export interface PasswordHasher {
  /** Devuelve el hash encoded (formato depende del algoritmo). */
  hash(password: string): Promise<string>;

  /** Verifica un password contra un hash encoded. Timing-constant. */
  verify(password: string, encodedHash: string): Promise<boolean>;

  /**
   * Hash dummy fijo — para usar cuando el user no existe en login y querés
   * mantener timing constante (no revelar si el email está en BD).
   */
  readonly dummyHash: string;
}
