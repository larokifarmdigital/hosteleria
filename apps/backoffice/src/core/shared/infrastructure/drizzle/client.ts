import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// `neon-serverless` (WebSocket) y no `neon-http`: hacen falta transacciones
// para las operaciones multi-write. Sin polyfill `ws`: `WebSocket` es global
// en Node >= 22, que es lo mínimo para esta app.

type Db = ReturnType<typeof drizzle<typeof schema>>;

// En `globalThis` y no en una variable de módulo: en `next dev` el HMR vuelve a
// evaluar el módulo en cada cambio y cada copia abriría su propio pool.
const globalForDb = globalThis as typeof globalThis & {
  __hosteleriaDb?: { url: string; pool: Pool; db: Db };
};

export function getDb(databaseUrl: string): Db {
  const current = globalForDb.__hosteleriaDb;
  if (current && current.url === databaseUrl) return current.db;

  const pool = new Pool({
    connectionString: databaseUrl,
    // Una función serverless se congela entre peticiones y al reanudarse sus conexiones
    // pueden estar muertas sin saberlo: se sueltan pronto en vez de guardarlas, y ninguna
    // consulta espera indefinidamente (una se quedó colgada 36 minutos en las pruebas).
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 20_000
  });
  // Neon cierra las conexiones inactivas y el cliente en reposo emite `error`;
  // sin un listener, eso tumba el proceso. El pool la descarta y abre otra.
  pool.on('error', () => {});
  const db = drizzle(pool, { schema });
  globalForDb.__hosteleriaDb = { url: databaseUrl, pool, db };
  return db;
}

export async function closeDb() {
  const current = globalForDb.__hosteleriaDb;
  if (!current) return;
  globalForDb.__hosteleriaDb = undefined;
  await current.pool.end();
}
