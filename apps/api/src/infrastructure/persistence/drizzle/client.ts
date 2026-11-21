import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index.js';

// `neon-serverless` (WebSocket) y no `neon-http`: hacen falta transacciones
// para las operaciones multi-write. Sin polyfill `ws`: `WebSocket` es global
// en Workers y en Node >=22 (scripts tsx locales).

type Db = ReturnType<typeof drizzle<typeof schema>>;

// En Workers una conexión solo vale dentro de la petición que la abrió: si otra
// petición la reutiliza, su promesa no resuelve nunca y Cloudflare corta con el
// error 1101. Por eso el Worker abre un pool por petición (`runWithRequestDb`)
// y `getDb` devuelve ese. El pool de módulo queda solo para scripts y tests,
// que corren en Node fuera de ese ámbito.
const requestDb = new AsyncLocalStorage<Db>();

let _db: Db | null = null;
let _pool: Pool | null = null;

export function getDb(databaseUrl: string): Db {
  const scoped = requestDb.getStore();
  if (scoped) return scoped;
  if (_db) return _db;
  _pool = new Pool({ connectionString: databaseUrl });
  _db = drizzle(_pool, { schema });
  return _db;
}

/** `waitUntil` deja cerrar el pool después de enviar la respuesta, sin retrasarla. */
export async function runWithRequestDb<T>(
  databaseUrl: string,
  waitUntil: (p: Promise<unknown>) => void,
  fn: () => Promise<T>
): Promise<T> {
  const pool = new Pool({ connectionString: databaseUrl });
  // Al acabar la petición el runtime corta el WebSocket y el cliente inactivo
  // emite `error`; sin un listener, eso sube como excepción no capturada.
  pool.on('error', () => {});
  try {
    return await requestDb.run(drizzle(pool, { schema }), fn);
  } finally {
    waitUntil(pool.end());
  }
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
