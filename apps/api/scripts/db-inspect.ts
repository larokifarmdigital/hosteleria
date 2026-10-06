/**
 * Diagnostic 100% read-only: ¿qué hay hoy en la BD?
 *
 * Correr con: `pnpm --filter @hosteleria/api db:inspect`
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
// Node 22+ tiene WebSocket global → Neon serverless lo usa directo, sin polyfill.

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL no está seteado en apps/api/.env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' Inspección de BD — Neon dev branch');
  console.log('═══════════════════════════════════════════\n');

  // 1. Tablas existentes
  const tables = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  console.log(`📋 Tablas existentes (${tables.rows.length}):`);
  tables.rows.forEach(r => console.log(`   • ${r.table_name}`));

  if (tables.rows.length === 0) {
    console.log('\n⚠ BD vacía — hay que correr migrations primero:');
    console.log('  pnpm --filter @hosteleria/api db:migrate');
    await pool.end();
    return;
  }

  // 2. Conteos clave
  const counts = await Promise.all([
    db.execute(sql`select count(*)::int as n from users`).catch(() => ({ rows: [{ n: '-' }] })),
    db.execute(sql`select count(*)::int as n from restaurants`).catch(() => ({ rows: [{ n: '-' }] })),
    db.execute(sql`select count(*)::int as n from spaces`).catch(() => ({ rows: [{ n: '-' }] })),
    db.execute(sql`select count(*)::int as n from languages`).catch(() => ({ rows: [{ n: '-' }] })),
    db.execute(sql`select count(*)::int as n from dishes`).catch(() => ({ rows: [{ n: '-' }] })),
    db.execute(sql`select count(*)::int as n from wines`).catch(() => ({ rows: [{ n: '-' }] }))
  ]);

  console.log('\n📊 Conteo de filas:');
  console.log(`   • users ........ ${(counts[0].rows[0] as any).n}`);
  console.log(`   • restaurants .. ${(counts[1].rows[0] as any).n}`);
  console.log(`   • spaces ....... ${(counts[2].rows[0] as any).n}`);
  console.log(`   • languages .... ${(counts[3].rows[0] as any).n}`);
  console.log(`   • dishes ....... ${(counts[4].rows[0] as any).n}`);
  console.log(`   • wines ........ ${(counts[5].rows[0] as any).n}`);

  // 3. Admin + restaurantes
  const admins = await db.execute<{ email: string; name: string; role: string }>(sql`
    select email, name, role from users where role = 'admin' limit 5
  `).catch(() => ({ rows: [] }));
  console.log(`\n👤 Admins:`);
  if (admins.rows.length === 0) console.log('   (ninguno)');
  else admins.rows.forEach(u => console.log(`   • ${u.email}  (${u.name})`));

  const restaurants = await db.execute<{ slug: string; name: string; state: string }>(sql`
    select slug, name, state from restaurants order by slug limit 10
  `).catch(() => ({ rows: [] }));
  console.log(`\n🍽  Restaurantes:`);
  if (restaurants.rows.length === 0) console.log('   (ninguno — hay que correr db:seed)');
  else restaurants.rows.forEach(r => console.log(`   • ${r.slug.padEnd(18)} ${r.name.padEnd(25)} [${r.state}]`));

  console.log('\n═══════════════════════════════════════════\n');
  await pool.end();
}

main().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
