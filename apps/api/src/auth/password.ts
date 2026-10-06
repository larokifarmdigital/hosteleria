import { scryptAsync } from '@noble/hashes/scrypt.js';
import { randomBytes } from '@noble/hashes/utils.js';

/**
 * Hashing de passwords usando **scrypt** vía `@noble/hashes`.
 *
 * **Por qué scrypt**:
 *  - Workers no permite `WebAssembly.compile()` dinámico → argon2 (hash-wasm) rompe.
 *  - Workers cappea PBKDF2 a 100k iterations → por debajo de OWASP.
 *  - `@noble/hashes/scrypt` es **pure JS**, zero deps, OWASP-approved para
 *    hashing de passwords.
 *
 * **Parámetros (OWASP 2023 para scrypt)**:
 *  - N = 2^14 (16 384) — factor de costo CPU/memoria
 *  - r = 8 — tamaño de bloque
 *  - p = 1 — paralelismo
 *  - 16 bytes salt, 32 bytes output
 *
 * Costo: ~50-150ms por hash en Workers. Suficientemente lento para brute-force,
 * suficientemente rápido para login UX.
 *
 * **Formato encoded**:
 *   `$scrypt$N=16384,r=8,p=1$<salt-b64>$<hash-b64>`
 */

const N = 16384;
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function b64encode(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  // asyncTick=10 cede el event loop cada 10ms → Workers resetea su CPU
  // budget y no explota con "exceeded CPU limit".
  const hash = await scryptAsync(password, salt, {
    N, r: R, p: P, dkLen: HASH_BYTES, asyncTick: 10
  });
  return `$scrypt$N=${N},r=${R},p=${P}$${b64encode(salt)}$${b64encode(hash)}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const parts = encoded.split('$');
    // Esperado: ['', 'scrypt', 'N=16384,r=8,p=1', '<salt>', '<hash>']
    if (parts.length !== 5 || parts[1] !== 'scrypt') return false;

    // Parse N=,r=,p= del params segment.
    const params: Record<string, number> = {};
    for (const kv of parts[2].split(',')) {
      const [k, v] = kv.split('=');
      params[k] = Number(v);
    }
    if (!params.N || !params.r || !params.p) return false;

    const salt = b64decode(parts[3]);
    const expected = b64decode(parts[4]);
    const actual = await scryptAsync(password, salt, {
      N: params.N, r: params.r, p: params.p, dkLen: expected.length, asyncTick: 10
    });

    // Comparación en tiempo constante.
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch (err) {
    console.error('[verifyPassword] threw:', err);
    return false;
  }
}

/**
 * Dummy hash fijo para hacer un verify constante cuando el user NO existe
 * — así el timing no revela si el email está en BD. Hash de "dummy".
 */
export const DUMMY_HASH =
  '$scrypt$N=16384,r=8,p=1$AAAAAAAAAAAAAAAAAAAAAA$y1dXUPwFP24QT9ADe1JOqzsJTcVRvdqINmzM2Hzgwjg';
