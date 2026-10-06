/**
 * Hashing de passwords usando **PBKDF2-SHA256 vía Web Crypto API**.
 *
 * **Por qué PBKDF2 y no argon2id**: Workers no permite `WebAssembly.compile()`
 * dinámico, y las libs JS de argon2 (hash-wasm, argon2-browser) todas compilan
 * el .wasm desde un base64 embebido → crashean en Workers. PBKDF2 funciona con
 * la Web Crypto API nativa, zero deps.
 *
 * **Parámetros (OWASP 2023)**:
 *  - 600 000 iteraciones SHA-256
 *  - 16 bytes salt random
 *  - 32 bytes output
 *
 * **Formato del hash encoded**:
 *   `$pbkdf2-sha256$i=600000$<salt-b64>$<hash-b64>`
 *
 * Compatible con verificación robusta: el verify parsea los params del propio
 * hash, así si en el futuro subimos iterations a 1M los hashes viejos
 * siguen funcionando con sus 600k originales.
 */

const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const ALGO = 'SHA-256';

function b64encode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
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

async function pbkdf2(password: string, salt: Uint8Array, iterations: number, bytes: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: ALGO },
    keyMaterial,
    bytes * 8
  );
  return new Uint8Array(derived);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, ITERATIONS, HASH_BYTES);
  return `$pbkdf2-sha256$i=${ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const parts = encoded.split('$');
    // Esperado: ['', 'pbkdf2-sha256', 'i=600000', '<salt>', '<hash>']
    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') return false;
    const iterations = Number(parts[2].slice(2));
    if (!Number.isFinite(iterations) || iterations < 1000) return false;
    const salt = b64decode(parts[3]);
    const expected = b64decode(parts[4]);
    const actual = await pbkdf2(password, salt, iterations, expected.length);
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
 * — así el timing no revela si el email está en BD. Hash del password
 * literal "dummy" con los params default.
 */
export const DUMMY_HASH =
  '$pbkdf2-sha256$i=600000$AAAAAAAAAAAAAAAAAAAAAA$Zge4Yk1bN8M0Bht6LwiidALHlr8RGvh3f0YfhIvV06s';
