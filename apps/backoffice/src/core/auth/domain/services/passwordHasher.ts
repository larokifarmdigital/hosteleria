export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /** Timing-constant: nunca cortocircuita antes de la comparación. */
  verify(password: string, encodedHash: string): Promise<boolean>;

  /**
   * Hash fijo contra el que verificamos cuando el user no existe, para
   * no filtrar por timing si un email está en BD.
   */
  readonly dummyHash: string;
}
