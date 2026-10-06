import { scryptAsync } from '@noble/hashes/scrypt.js';
import { randomBytes } from '@noble/hashes/utils.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';

/**
 * scrypt pure JS. En Workers no vale argon2 (bloquean WASM dinámico) ni
 * PBKDF2 OWASP (cappean a 100k iteraciones). `asyncTick: 10` cede el
 * event loop cada 10ms para no reventar el CPU budget del isolate.
 *
 * Formato encoded: `$scrypt$N=16384,r=8,p=1$<salt-b64>$<hash-b64>`.
 * Parámetros OWASP 2023: N = 2^14, r = 8, p = 1; salt 16B, dkLen 32B.
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

export class ScryptPasswordHasher implements PasswordHasher {
  /** Hash del password literal `"dummy"` — ver `PasswordHasher.dummyHash`. */
  readonly dummyHash =
    '$scrypt$N=16384,r=8,p=1$AAAAAAAAAAAAAAAAAAAAAA$y1dXUPwFP24QT9ADe1JOqzsJTcVRvdqINmzM2Hzgwjg';

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await scryptAsync(password, salt, {
      N, r: R, p: P, dkLen: HASH_BYTES, asyncTick: 10
    });
    return `$scrypt$N=${N},r=${R},p=${P}$${b64encode(salt)}$${b64encode(hash)}`;
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    try {
      // ['', 'scrypt', 'N=16384,r=8,p=1', '<salt>', '<hash>'] — leemos
      // los parámetros del propio hash en vez de las constantes para
      // poder validar hashes antiguos si en el futuro cambian los defaults.
      const parts = encoded.split('$');
      if (parts.length !== 5 || parts[1] !== 'scrypt') return false;

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

      // XOR en tiempo constante — no cortocircuitar al primer byte distinto.
      if (actual.length !== expected.length) return false;
      let diff = 0;
      for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
      return diff === 0;
    } catch (err) {
      console.error('[ScryptPasswordHasher.verify] threw:', err);
      return false;
    }
  }
}
