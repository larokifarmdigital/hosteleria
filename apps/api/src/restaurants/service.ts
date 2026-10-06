import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { restaurants, languages, restaurantLocales } from '../infrastructure/persistence/drizzle/schema/content.js';
import type { Env } from '../env.js';

/**
 * Lógica de negocio de los restaurantes. Las rutas HTTP (route.ts) solo
 * validan y llaman acá.
 *
 * Exports:
 *  - `createRestaurantWithLocales` — crea + inserta locales en 1 transacción
 *  - `patchRestaurant` — update + reemplazo de locales + snapshot si publica
 *  - `discardChanges` — restaura campos al último snapshot publicado
 *  - `deleteRestaurant` — borrado hard
 */

export interface CreateInput {
  slug: string;
  name: string;
  domain: string;
  logoInitial: string;
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
}

export type PatchInput = Partial<{
  name: string;
  domain: string;
  logoInitial: string;
  coverGradient: string;
  state: 'published' | 'draft' | 'warnings' | 'new';
  acceptsBookings: boolean;
  showSocials: boolean;
  address: Record<string, any>;
  contact: Record<string, any>;
  socials: Record<string, any>;
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
  timezone: string;
  rebuildHookUrl: string | null;
  seo: { title?: Record<string, string>; description?: Record<string, string> };
}>;

export interface PatchResult {
  /** True cuando corresponde disparar el rebuild hook de la landing. */
  shouldRebuild: boolean;
  rebuildHookUrl: string | null;
  slug: string;
  id: string;
}

/**
 * Crea restaurante + locales en **1 transacción**. Si falla el insert de
 * locales, hace rollback del restaurante → nunca restaurantes huérfanos.
 *
 * Lanza:
 *  - 409 `slug_taken` si ya existe un restaurant con ese slug
 *  - 400 `unknown_locale:xxx` si algún locale code no está en `languages`
 */
export async function createRestaurantWithLocales(env: Env, body: CreateInput): Promise<{ id: string }> {
  const db = getDb(env.DATABASE_URL);

  const existing = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, body.slug) });
  if (existing) throw new HTTPException(409, { message: 'slug_taken' });

  const localesRows = await db.query.languages.findMany();
  const codeToId = new Map(localesRows.map(l => [l.code, l.id]));
  const defaultId = codeToId.get(body.defaultLocaleCode);
  if (!defaultId) throw new HTTPException(400, { message: `unknown_locale:${body.defaultLocaleCode}` });

  const activeIds = body.activeLocaleCodes.map(code => {
    const id = codeToId.get(code);
    if (!id) throw new HTTPException(400, { message: `unknown_locale:${code}` });
    return id;
  });
  // El default DEBE estar en los activos (invariant).
  if (!activeIds.includes(defaultId)) activeIds.push(defaultId);

  return db.transaction(async (tx) => {
    const [r] = await tx.insert(restaurants).values({
      slug: body.slug,
      name: body.name,
      domain: body.domain,
      logoInitial: body.logoInitial || body.name.charAt(0).toUpperCase(),
      defaultLocaleId: defaultId,
      state: 'draft'
    }).returning({ id: restaurants.id });

    await tx.insert(restaurantLocales).values(
      activeIds.map(languageId => ({ restaurantId: r.id, languageId }))
    );
    return { id: r.id };
  });
}

/**
 * Patch del restaurante. Si pasa a `state=published`, guarda un snapshot
 * de los campos editables para que `discardChanges` pueda volver atrás.
 *
 * Si viene `activeLocaleCodes`, reemplaza TODA la lista de locales.
 * Patch + delete-insert de locales corren en 1 transacción.
 *
 * Devuelve si corresponde disparar rebuild hook (publicó ahora o estaba
 * publicado y se editó un campo relevante).
 *
 * Lanza:
 *  - 404 si no existe el slug
 *  - 400 `unknown_locale:xxx` si algún locale no existe
 */
export async function patchRestaurant(
  env: Env,
  slug: string,
  body: PatchInput,
  actorId: string
): Promise<PatchResult> {
  const db = getDb(env.DATABASE_URL);

  const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
  if (!r) throw new HTTPException(404, { message: 'not_found' });

  const wasPublished = r.state === 'published';
  const willBePublished = body.state === 'published';

  const updates: Partial<typeof restaurants.$inferInsert> = {
    updatedAt: new Date(),
    updatedBy: actorId
  };
  if (body.name !== undefined) updates.name = body.name;
  if (body.domain !== undefined) updates.domain = body.domain;
  if (body.logoInitial !== undefined) updates.logoInitial = body.logoInitial;
  if (body.coverGradient !== undefined) updates.coverGradient = body.coverGradient;
  if (body.acceptsBookings !== undefined) updates.acceptsBookings = body.acceptsBookings;
  if (body.showSocials !== undefined) updates.showSocials = body.showSocials;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.rebuildHookUrl !== undefined) updates.rebuildHookUrl = body.rebuildHookUrl;
  if (body.address) updates.address = body.address;
  if (body.contact) updates.contact = body.contact;
  if (body.socials) updates.socials = body.socials;
  if (body.seo) updates.seo = body.seo;

  // Si se publica, snapshotear los campos (los nuevos del body o los actuales).
  if (body.state !== undefined) {
    updates.state = body.state;
    if (body.state === 'published') {
      updates.lastPublishedAt = new Date();
      updates.publishedSnapshot = {
        name: r.name, domain: r.domain, logoInitial: r.logoInitial,
        coverGradient: r.coverGradient, timezone: r.timezone,
        address: r.address, contact: r.contact, socials: r.socials, seo: r.seo,
        acceptsBookings: r.acceptsBookings, showSocials: r.showSocials,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.domain !== undefined ? { domain: body.domain } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.contact !== undefined ? { contact: body.contact } : {}),
        ...(body.socials !== undefined ? { socials: body.socials } : {}),
        ...(body.seo !== undefined ? { seo: body.seo } : {})
      };
    }
  }

  // Resolver cambio de defaultLocale.
  if (body.defaultLocaleCode) {
    const lang = await db.query.languages.findFirst({ where: eq(languages.code, body.defaultLocaleCode) });
    if (!lang) throw new HTTPException(400, { message: `unknown_locale:${body.defaultLocaleCode}` });
    updates.defaultLocaleId = lang.id;
  }

  // Patch + reemplazo de locales en 1 transacción.
  await db.transaction(async (tx) => {
    await tx.update(restaurants).set(updates).where(eq(restaurants.id, r.id));

    if (body.activeLocaleCodes) {
      const langs = await tx.query.languages.findMany();
      const codeToId = new Map(langs.map(l => [l.code, l.id]));
      const activeIds = body.activeLocaleCodes.map(code => {
        const id = codeToId.get(code);
        if (!id) throw new HTTPException(400, { message: `unknown_locale:${code}` });
        return id;
      });
      await tx.delete(restaurantLocales).where(eq(restaurantLocales.restaurantId, r.id));
      if (activeIds.length > 0) {
        await tx.insert(restaurantLocales).values(activeIds.map(languageId => ({ restaurantId: r.id, languageId })));
      }
    }
  });

  // Rebuild cuando: pasa a published OR ya estaba publicado y se editó algo.
  // Los providers de deploy (CF Pages, Vercel, Netlify) deduplican rebuilds.
  const shouldRebuild = (willBePublished && !wasPublished) || (wasPublished && body.state === undefined);

  return { shouldRebuild, rebuildHookUrl: r.rebuildHookUrl, slug: r.slug, id: r.id };
}

/**
 * Restaura los campos del restaurant al último `publishedSnapshot`.
 * Útil cuando el editor hizo cambios en borrador y quiere volver atrás.
 *
 * Lanza:
 *  - 404 si no existe el slug
 *  - 400 `no_snapshot` si nunca se publicó (no hay snapshot a restaurar)
 */
export async function discardChanges(env: Env, slug: string, actorId: string): Promise<{ id: string }> {
  const db = getDb(env.DATABASE_URL);
  const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
  if (!r) throw new HTTPException(404, { message: 'not_found' });
  if (!r.publishedSnapshot) throw new HTTPException(400, { message: 'no_snapshot' });

  const snap = r.publishedSnapshot as Record<string, any>;
  await db.update(restaurants).set({
    name: snap.name ?? r.name,
    domain: snap.domain ?? r.domain,
    logoInitial: snap.logoInitial ?? r.logoInitial,
    coverGradient: snap.coverGradient ?? r.coverGradient,
    timezone: snap.timezone ?? r.timezone,
    address: snap.address ?? r.address,
    contact: snap.contact ?? r.contact,
    socials: snap.socials ?? r.socials,
    seo: snap.seo ?? r.seo,
    acceptsBookings: snap.acceptsBookings ?? r.acceptsBookings,
    showSocials: snap.showSocials ?? r.showSocials,
    state: 'published',
    updatedAt: new Date(),
    updatedBy: actorId
  }).where(eq(restaurants.id, r.id));

  return { id: r.id };
}

/** Hard delete del restaurant (cascade a spaces, dishes, wines, etc.). */
export async function deleteRestaurant(env: Env, slug: string): Promise<void> {
  const db = getDb(env.DATABASE_URL);
  const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, slug) });
  if (!r) throw new HTTPException(404, { message: 'not_found' });
  await db.delete(restaurants).where(eq(restaurants.id, r.id));
}
