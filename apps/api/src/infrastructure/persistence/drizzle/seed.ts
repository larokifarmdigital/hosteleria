/**
 * Seed inicial — bootstrap del backoffice.
 *
 * Idempotente: se puede correr varias veces sin duplicar.
 *  - Idiomas: es, ca, en, fr (fr disponible pero no activo por defecto)
 *  - Admin user: leyendo ADMIN_EMAIL / ADMIN_PASSWORD del env
 *  - 6 restaurantes shell vacíos con slugs canónicos
 *
 * Uso: `pnpm --filter @hosteleria/api db:seed`
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env', override: false });

import { hashPassword } from '../../../auth/password-hash.js';
import { eq } from 'drizzle-orm';
import { getDb } from './client.js';
import * as schema from './schema/index.js';

const SEED_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'ca', name: 'Català' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' }
];

const SEED_RESTAURANTS = [
  { slug: 'casabella', name: 'Casabella', domain: 'restaurantcasabella.com', logoInitial: 'C', activeLocales: ['es', 'ca', 'en'], defaultLocale: 'es' },
  { slug: 'guixot', name: 'Guixot', domain: 'guixot.cat', logoInitial: 'G', activeLocales: ['es', 'ca', 'en'], defaultLocale: 'ca' },
  { slug: 'la-principal', name: 'La Principal', domain: 'laprincipal.barcelona', logoInitial: 'L', activeLocales: ['es', 'ca'], defaultLocale: 'ca' },
  { slug: 'roure', name: 'Roure', domain: 'roure.eat', logoInitial: 'R', activeLocales: ['es', 'ca', 'en'], defaultLocale: 'es' },
  { slug: 'pubilla', name: 'Pubilla', domain: 'lapubilla.cat', logoInitial: 'P', activeLocales: ['es', 'ca'], defaultLocale: 'ca' },
  { slug: 'ocana', name: 'Ocaña', domain: 'ocanabar.com', logoInitial: 'O', activeLocales: ['es', 'ca', 'en'], defaultLocale: 'es' }
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? 'Admin';

  if (!databaseUrl) throw new Error('DATABASE_URL no está en el entorno');
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD deben estar en .env.local para el seed');
  }
  if (adminPassword.length < 8) throw new Error('ADMIN_PASSWORD mínimo 8 chars');

  const db = getDb(databaseUrl);

  // ─── Languages ─────────────────────────────────────────────────
  console.log('▸ Idiomas…');
  const langByCode = new Map<string, string>(); // code → id
  for (const lang of SEED_LANGUAGES) {
    const existing = await db.query.languages.findFirst({ where: eq(schema.languages.code, lang.code) });
    if (existing) {
      langByCode.set(lang.code, existing.id);
      console.log(`   · ${lang.code} ya existía`);
    } else {
      const [row] = await db.insert(schema.languages).values(lang).returning({ id: schema.languages.id });
      langByCode.set(lang.code, row.id);
      console.log(`   ✓ ${lang.code} creado`);
    }
  }

  // ─── Admin user ────────────────────────────────────────────────
  console.log('▸ Admin user…');
  const existingAdmin = await db.query.users.findFirst({ where: eq(schema.users.email, adminEmail) });
  if (existingAdmin) {
    console.log(`   · ${adminEmail} ya existía (${existingAdmin.role})`);
  } else {
    const passwordHash = await hashPassword(adminPassword);
    await db.insert(schema.users).values({
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: 'admin'
    });
    console.log(`   ✓ ${adminEmail} creado como admin`);
  }

  // ─── Restaurantes shell + idiomas activos ──────────────────────
  console.log('▸ Restaurantes shell…');
  for (const r of SEED_RESTAURANTS) {
    const defaultLocaleId = langByCode.get(r.defaultLocale);
    if (!defaultLocaleId) throw new Error(`defaultLocale ${r.defaultLocale} no encontrado`);

    const existing = await db.query.restaurants.findFirst({
      where: eq(schema.restaurants.slug, r.slug)
    });

    let restaurantId: string;
    if (existing) {
      restaurantId = existing.id;
      console.log(`   · ${r.slug} ya existía`);
    } else {
      const [row] = await db.insert(schema.restaurants).values({
        slug: r.slug,
        name: r.name,
        domain: r.domain,
        logoInitial: r.logoInitial,
        defaultLocaleId,
        state: 'draft',
        acceptsBookings: true,
        showSocials: false
      }).returning({ id: schema.restaurants.id });
      restaurantId = row.id;
      console.log(`   ✓ ${r.slug} creado`);
    }

    // Idiomas activos m2m — insertar los que faltan
    const currentLocales = await db.query.restaurantLocales.findMany({
      where: eq(schema.restaurantLocales.restaurantId, restaurantId)
    });
    const currentSet = new Set(currentLocales.map(l => l.languageId));
    for (const code of r.activeLocales) {
      const langId = langByCode.get(code);
      if (!langId) continue;
      if (currentSet.has(langId)) continue;
      await db.insert(schema.restaurantLocales).values({ restaurantId, languageId: langId });
    }
  }

  console.log('\n✅ Seed OK');
  console.log(`   Login en el backoffice con ${adminEmail}`);
  console.log(`   (cambia el password al primer login)\n`);
}

main().catch((err) => {
  console.error('\n❌ Seed falló:', err);
  process.exit(1);
});
