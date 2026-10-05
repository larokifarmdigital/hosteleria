import { argon2id, argon2Verify } from 'hash-wasm';

/**
 * Hashing de passwords con **argon2id** (standard OWASP para auth).
 *
 * ANTES usábamos `@node-rs/argon2` (Rust nativo) — no corre en Workers V8.
 * `hash-wasm` compila argon2 a WebAssembly y produce **el mismo formato
 * de hash encoded** (`$argon2id$v=19$m=...,t=...,p=...$salt$hash`), lo cual
 * significa que los hashes YA en BD siguen validando sin re-hashear.
 *
 * Params alineados con OWASP Argon2id Cheat Sheet (2023):
 *  - m (memory) = 19 MiB (19456 KiB)
 *  - t (iterations) = 2
 *  - p (parallelism) = 1
 *  - salt = 16 random bytes
 *  - hash length = 32 bytes
 *
 * Dummy hash para timing-attack mitigation (igual que antes).
 */

const ARGON_PARAMS = {
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  outputType: 'encoded' as const
};

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return argon2id({ ...ARGON_PARAMS, password, salt });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    // hash malformed → tratarlo como mismatch, no explotar.
    return false;
  }
}

/**
 * Dummy hash fijo (del password "dummy") para hacer un verify constante
 * cuando el user NO existe — así el timing no revela si el email está en
 * BD. Lo precalculamos para no gastar CPU generándolo en cada 401.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlkdW1teWR1bW15ZA$Y7F6xkR5tt+kxu5nk7PQZV27f5I1bFvYQmCwRTi5s0Q';
