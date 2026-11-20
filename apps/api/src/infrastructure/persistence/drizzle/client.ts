import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index.js';

// `neon-serverless` (WebSocket) y no `neon-http`: hacen falta transacciones
// para las operaciones multi-write. Sin polyfill `ws`: `WebSocket` es global
// en Workers y en Node >=22 (scripts tsx locales).

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export function getDb(databaseUrl: string) {
  if (_db) return _db;
  _pool = new Pool({ connectionString: databaseUrl });
  _db = drizzle(_pool, { schema });
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
