import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index.js';

/**
 * Cliente Drizzle sobre Neon serverless (WebSocket).
 *
 * Elegimos `neon-serverless` sobre `neon-http` porque necesitamos
 * transacciones (`db.transaction(async tx => …)`) para garantizar
 * atomicidad en operaciones multi-write (crear restaurante + locales,
 * patch con reemplazo de locales, delete que promueve default…).
 *
 * **Workers**: el runtime tiene `WebSocket` global nativo. No necesitamos
 * polyfill con el package `ws` como en Node.
 *
 * **Scripts tsx locales**: `tsx` corre bajo Node 20+ que también tiene
 * `WebSocket` global desde v22, así que tampoco necesita polyfill.
 */

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export function getDb(databaseUrl: string) {
  if (_db) return _db;
  _pool = new Pool({ connectionString: databaseUrl });
  _db = drizzle(_pool, { schema });
  return _db;
}

/** Cierra el pool. Útil en scripts (seed, migraciones). */
export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
