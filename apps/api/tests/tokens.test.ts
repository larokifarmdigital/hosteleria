import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

/**
 * Test del hashing de tokens — verifica que el helper es determinístico
 * y que tokens distintos producen hashes distintos.
 *
 * No testea createToken() porque toca BD; eso va en tests de integración.
 */

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('token hashing', () => {
  it('mismo input → mismo hash (determinístico)', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'));
  });

  it('inputs distintos → hashes distintos', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('hash es hex de 64 chars (SHA-256)', () => {
    const h = hashToken('whatever');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
