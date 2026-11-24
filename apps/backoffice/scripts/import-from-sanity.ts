// Vuelca el contenido de un restaurante de Sanity al api (pista M3).
//
//   pnpm import:sanity <slug> [--apply] [--publish] [--prune] [--locales=es,en]
//
// Sin `--apply` no escribe nada: enseña qué cambiaría. Se puede repetir: lo que
// ya está igual no se toca. Escribe por el api, con las mismas validaciones que
// el backoffice, así que hace falta una sesión de administrador:
//
//   API_URL      base del api (por defecto http://localhost:4400/api)
//   API_COOKIE   cookie de sesión, `hs_session=…` (cópiala del navegador con el backoffice abierto)
//   SANITY_PROJECT_ID / SANITY_DATASET   por defecto, los de apps/studio/.env
//
// `--locales` deja activos solo esos idiomas (los que en Sanity están activos
// pero sin traducir no se pueden publicar). No copia imágenes (avisa si
// encuentra alguna) ni reseñas, que el api todavía no tiene.
import { config } from 'dotenv';
import {
  canonical, mapCategory, mapDish, mapLegalPage, mapRestaurant, mapSpace, mapWine,
  type CategoryImport, type DishImport, type LegalPageImport, type SpaceImport, type WineImport
} from './sanity-import/map';

config({ path: new URL('../../studio/.env', import.meta.url).pathname });

type Doc = Record<string, any>;

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const APPLY = args.includes('--apply');
const PUBLISH = args.includes('--publish');
const PRUNE = args.includes('--prune');
const ONLY_LOCALES = args.find(a => a.startsWith('--locales='))?.slice('--locales='.length).split(',').map(s => s.trim()).filter(Boolean);
const API_URL = (process.env.API_URL ?? 'http://localhost:4400/api').replace(/\/$/, '');
const API_COOKIE = process.env.API_COOKIE ?? '';
const PROJECT = process.env.SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID;
const DATASET = process.env.SANITY_DATASET ?? process.env.SANITY_STUDIO_DATASET ?? 'production';

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!slug) fail('Falta el slug del restaurante. Uso: pnpm import:sanity <slug> [--apply] [--publish] [--prune]');
if (!PROJECT) fail('Falta SANITY_PROJECT_ID (o SANITY_STUDIO_PROJECT_ID en apps/studio/.env).');
if (!API_COOKIE) fail('Falta API_COOKIE con la cookie de sesión de un administrador (`hs_session=…`).');
if (PUBLISH && !APPLY) fail('`--publish` necesita `--apply`.');

// ─── Sanity ────────────────────────────────────────────────────────────────

async function sanity<T>(groq: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = new URL(`https://${PROJECT}.api.sanity.io/v2024-10-01/data/query/${DATASET}`);
  url.searchParams.set('query', groq);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(url);
  const body = await res.json() as { result: T };
  if (!res.ok) fail(`Sanity respondió ${res.status}: ${JSON.stringify(body)}`);
  return body.result;
}

// ─── Api ───────────────────────────────────────────────────────────────────

let writes = 0;

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL + path, {
      method,
      headers: { cookie: API_COOKIE, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    // El api limita a 100 peticiones por minuto y usuario: se espera y se sigue.
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get('retry-after') ?? 10);
      console.log(`  … límite de peticiones; espero ${wait} s`);
      await new Promise(r => setTimeout(r, (wait + 1) * 1000));
      continue;
    }
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }
    if (!res.ok) fail(`${method} ${path} → ${res.status} ${typeof json === 'string' ? json : JSON.stringify(json)}`);
    return json as T;
  }
}

/** Apunta el cambio y, con `--apply`, lo hace. En seco devuelve `null`. */
async function write<T = any>(what: string, method: string, path: string, body?: unknown): Promise<T | null> {
  writes++;
  console.log(`  ${APPLY ? '✓' : '·'} ${what}`);
  return APPLY ? api<T>(method, path, body) : null;
}

// ─── Volcado ───────────────────────────────────────────────────────────────

const warnings: string[] = [];
const warn = (m: string) => { if (!warnings.includes(m)) warnings.push(m); };

function changedKeys(expected: Record<string, unknown>, current: Record<string, unknown>): string[] {
  return Object.keys(expected).filter(k => canonical(expected[k]) !== canonical(current[k]));
}

/** Nombre en el idioma principal: lo que identifica a una categoría o un plato entre volcados. */
function keyOf(name: Record<string, string>, defaultLocale: string): string {
  return (name[defaultLocale] ?? Object.values(name)[0] ?? '').trim().toLowerCase();
}

function assertUnique(keys: string[], what: string) {
  const repeated = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (repeated.length > 0) fail(`${what} repetidos en Sanity (${[...new Set(repeated)].join(', ')}): no se pueden emparejar entre volcados.`);
}

interface Source {
  restaurant: ReturnType<typeof mapRestaurant>;
  spaces: (SpaceImport & {
    dishCategories: CategoryImport[]; dishes: DishImport[];
    drinkCategories: CategoryImport[]; drinks: DishImport[];
    wineCategories: CategoryImport[]; wines: WineImport[];
  })[];
  legalPages: LegalPageImport[];
}

async function readSource(): Promise<Source> {
  const doc = await sanity<Doc | null>(
    `*[_type == "restaurante" && slug.current == $slug][0]{
      ...,
      "idiomaPorDefecto": idiomaPorDefecto->codigo,
      "idiomasActivos": idiomasActivos[]->codigo,
      "espacios": espacios[]->{ ... } | order(orden asc)
    }`, { slug });
  if (!doc) fail(`El restaurante «${slug}» no existe en Sanity.`);
  const espacios: Doc[] = (doc.espacios ?? []).filter(Boolean);
  if (espacios.length === 0) fail(`El restaurante «${slug}» no tiene espacios en Sanity.`);

  const spaces: Source['spaces'] = [];
  for (const e of espacios) {
    const [dishCats, dishes, wineCats, wines, drinks, drinkCats] = await Promise.all([
      sanity<Doc[]>(`*[_type == "categoriaPlato" && espacio._ref == $id] | order(orden asc)`, { id: e._id }),
      sanity<Doc[]>(`*[_type == "plato" && espacio._ref == $id] | order(orden asc)`, { id: e._id }),
      sanity<Doc[]>(`*[_type == "categoriaVino" && espacio._ref == $id] | order(orden asc)`, { id: e._id }),
      sanity<Doc[]>(`*[_type == "vino" && espacio._ref == $id] | order(orden asc)`, { id: e._id }),
      sanity<Doc[]>(`*[_type == "bebida" && espacio._ref == $id] | order(orden asc)`, { id: e._id }),
      sanity<Doc[]>(`*[_type == "categoriaBebida" && espacio._ref == $id] | order(orden asc)`, { id: e._id })
    ]);
    spaces.push({
      ...mapSpace(e, warn),
      dishCategories: dishCats.map(mapCategory),
      dishes: dishes.map(mapDish),
      drinkCategories: drinkCats.map(mapCategory),
      drinks: drinks.map(mapDish),
      wineCategories: wineCats.map(mapCategory),
      wines: wines.map(mapWine)
    });
  }

  const legal = await sanity<Doc[]>(`*[_type == "paginaLegal" && restaurante._ref == $id] | order(orden asc)`, { id: doc._id });
  const reviews = await sanity<number>(`count(*[_type == "resena" && restaurante._ref == $id])`, { id: doc._id });
  if (reviews > 0) warn(`hay ${reviews} reseñas: el api aún no las guarda y no se copian`);

  const restaurant = mapRestaurant(doc, warn);
  if (ONLY_LOCALES) {
    const unknown = ONLY_LOCALES.filter(c => !restaurant.activeLocaleCodes.includes(c));
    if (unknown.length > 0) fail(`--locales pide idiomas que el restaurante no tiene en Sanity: ${unknown.join(', ')}`);
    const dropped = restaurant.activeLocaleCodes.filter(c => !ONLY_LOCALES.includes(c));
    if (dropped.length > 0) warn(`idiomas que se dejan sin activar: ${dropped.join(', ')} (sus textos, si los hay, se guardan igual)`);
    restaurant.activeLocaleCodes = ONLY_LOCALES;
    if (!ONLY_LOCALES.includes(restaurant.defaultLocaleCode)) restaurant.defaultLocaleCode = ONLY_LOCALES[0];
  }

  return {
    restaurant,
    spaces,
    legalPages: legal.map(p => mapLegalPage(p, warn)).filter((p): p is LegalPageImport => p !== null)
  };
}

// Las bebidas van por las rutas de platos, con `kind=drink`.
type Carta = 'dishes' | 'wines' | 'drinks';
const CARTA = {
  dishes: { base: 'dishes', key: 'dishes', query: '', label: 'plato' },
  drinks: { base: 'dishes', key: 'dishes', query: '&kind=drink', label: 'bebida' },
  wines: { base: 'wines', key: 'wines', query: '', label: 'vino' }
} as const;

async function syncCarta(
  carta: Carta,
  spaceId: string | null,
  space: Source['spaces'][number],
  defaultLocale: string
) {
  const { base: kind, key, query, label } = CARTA[carta];
  const categories = carta === 'dishes' ? space.dishCategories : carta === 'drinks' ? space.drinkCategories : space.wineCategories;
  const items: (DishImport | WineImport)[] = carta === 'dishes' ? space.dishes : carta === 'drinks' ? space.drinks : space.wines;
  const itemKey = (i: DishImport | WineImport) =>
    typeof i.name === 'string' ? `${i.name}|${(i as WineImport).region ?? ''}`.toLowerCase() : keyOf(i.name, defaultLocale);

  assertUnique(categories.map(c => keyOf(c.name, defaultLocale)), `Categorías de ${label}s de «${space.name}»`);

  const current = spaceId
    ? {
        categories: (await api(`GET`, `/${kind}/categories?spaceId=${spaceId}${query}`)).categories as Doc[],
        items: ((await api('GET', `/${kind}?restaurantSlug=${slug}${query}`))[key] as Doc[]).filter(i => i.spaceId === spaceId)
      }
    : { categories: [], items: [] };

  const keptCategoryIds = new Set<string>();
  const keptItemIds = new Set<string>();

  for (const cat of categories) {
    const key = keyOf(cat.name, defaultLocale);
    const existing = current.categories.find(c => keyOf(c.name ?? {}, defaultLocale) === key);
    let categoryId: string | null = existing?.id ?? null;
    if (!existing) {
      const created = await write(`categoría de ${label}s «${key}»: crear`, 'POST', `/${kind}/categories`, { spaceId, name: cat.name, order: cat.order, ...(carta === 'drinks' ? { kind: 'drink' } : {}) });
      categoryId = created?.category.id ?? null;
    } else {
      keptCategoryIds.add(existing.id);
      const diff = changedKeys({ name: cat.name, order: cat.order }, existing);
      if (diff.length > 0) await write(`categoría de ${label}s «${key}»: actualizar ${diff.join(', ')}`, 'PATCH', `/${kind}/categories/${existing.id}`, { name: cat.name, order: cat.order });
    }

    const inCategory = items.filter(i => i.categorySourceId === cat.sourceId);
    assertUnique(inCategory.map(itemKey), `${label}s de «${key}»`);
    for (const item of inCategory) {
      const { sourceId: _s, categorySourceId: _c, ...fields } = item;
      const key2 = itemKey(item);
      const found = existing ? current.items.find(i => i.categoryId === existing.id && itemKey(i as any) === key2) : undefined;
      if (!found) {
        // El alta no admite `null`: un precio que no existe, sencillamente no se envía.
        const body = Object.fromEntries(Object.entries({ spaceId, categoryId, ...fields }).filter(([, v]) => v !== null));
        await write(`${label} «${key2}»: crear`, 'POST', `/${kind}`, body);
      } else {
        keptItemIds.add(found.id);
        const diff = changedKeys(fields, found);
        if (diff.length > 0) await write(`${label} «${key2}»: actualizar ${diff.join(', ')}`, 'PATCH', `/${kind}/${found.id}`, fields);
      }
    }
  }

  const orphans = items.filter(i => !categories.some(c => c.sourceId === i.categorySourceId));
  if (orphans.length > 0) warn(`«${space.name}»: ${orphans.length} ${label}s sin categoría en Sanity; no se copian`);

  // Lo que hay en el api y no en Sanity: se avisa y, con `--prune`, se borra.
  const extraItems = current.items.filter(i => !keptItemIds.has(i.id));
  const extraCategories = current.categories.filter(c => !keptCategoryIds.has(c.id));
  for (const i of extraItems) {
    const name = typeof i.name === 'string' ? i.name : keyOf(i.name ?? {}, defaultLocale);
    if (PRUNE) await write(`${label} «${name}»: borrar (no está en Sanity)`, 'DELETE', `/${kind}/${i.id}`);
    else warn(`«${space.name}»: ${label} «${name}»: está en el api y no en Sanity (se deja; \`--prune\` lo borra)`);
  }
  for (const c of extraCategories) {
    const name = keyOf(c.name ?? {}, defaultLocale);
    if (PRUNE) await write(`categoría de ${label}s «${name}»: borrar (no está en Sanity)`, 'DELETE', `/${kind}/categories/${c.id}`);
    else warn(`«${space.name}»: la categoría de ${label}s «${name}» está en el api y no en Sanity (se deja; \`--prune\` la borra)`);
  }
}

async function sync(source: Source) {
  const { restaurant: r } = source;
  const languages = ((await api('GET', '/languages')).languages as Doc[]).map(l => l.code);
  const missing = r.activeLocaleCodes.filter(c => !languages.includes(c));
  if (missing.length > 0) fail(`Idiomas que el api no tiene dados de alta: ${missing.join(', ')}. Créalos en el backoffice antes de volcar.`);

  console.log('Ficha');
  const list = (await api('GET', '/restaurants')).restaurants as Doc[];
  let current = list.find(x => x.slug === slug) ?? null;
  if (!current) {
    const created = await write('restaurante: crear', 'POST', '/restaurants', {
      slug, name: r.content.name, domain: r.content.domain,
      defaultLocaleCode: r.defaultLocaleCode, activeLocaleCodes: r.activeLocaleCodes
    });
    current = created?.restaurant ?? null;
  }
  const expected: Record<string, unknown> = {
    ...r.content, defaultLocale: r.defaultLocaleCode, activeLocales: [...r.activeLocaleCodes].sort()
  };
  const now: Record<string, unknown> = current ? { ...current, activeLocales: [...current.activeLocales].sort() } : {};
  const diff = changedKeys(expected, now);
  if (diff.length > 0) {
    const patch: Record<string, unknown> = { state: 'draft' };
    for (const k of diff) {
      if (k === 'defaultLocale') patch.defaultLocaleCode = r.defaultLocaleCode;
      else if (k === 'activeLocales') patch.activeLocaleCodes = r.activeLocaleCodes;
      else patch[k] = r.content[k];
    }
    await write(`ficha: actualizar ${diff.join(', ')}`, 'PATCH', `/restaurants/${slug}`, patch);
  }

  const currentSpaces = current ? (await api('GET', `/restaurants/${slug}/spaces`)).spaces as Doc[] : [];
  for (const [index, space] of source.spaces.entries()) {
    console.log(`Espacio «${space.name}»`);
    let s = currentSpaces.find(x => x.slug === space.slug) ?? null;
    if (!s) {
      const created = await write('espacio: crear', 'POST', `/restaurants/${slug}/spaces`, {
        slug: space.slug, name: space.name, type: space.type, isDefault: index === 0
      });
      s = created?.space ?? null;
    }
    const want: Record<string, unknown> = {
      name: space.name, type: space.type, order: index, isDefault: index === 0, ...space.content, schedule: space.schedule
    };
    // Dejar de ser el principal no se pide: lo hace el api al marcar otro.
    if (index !== 0) delete want.isDefault;
    const d = changedKeys(want, s ?? {});
    if (d.length > 0) {
      const patch: Record<string, unknown> = { state: 'draft' };
      for (const k of d) patch[k] = want[k];
      await write(`espacio: actualizar ${d.join(', ')}`, 'PATCH', `/restaurants/${slug}/spaces/${s?.id}`, patch);
    }
    await syncCarta('dishes', s?.id ?? null, space, r.defaultLocaleCode);
    await syncCarta('drinks', s?.id ?? null, space, r.defaultLocaleCode);
    await syncCarta('wines', s?.id ?? null, space, r.defaultLocaleCode);
  }
  for (const s of currentSpaces.filter(x => !source.spaces.some(e => e.slug === x.slug))) {
    warn(`el espacio «${s.slug}» está en el api y no en Sanity (se deja como está)`);
  }

  console.log('Páginas legales');
  const currentLegal = current ? (await api('GET', `/restaurants/${slug}/legal-pages`)).legalPages as Doc[] : [];
  for (const page of source.legalPages) {
    const { type, ...fields } = page;
    const found = currentLegal.find(p => p.type === type);
    const d = found ? changedKeys(fields, found) : ['todo'];
    if (d.length > 0) await write(`${type}: ${found ? `actualizar ${d.join(', ')}` : 'crear'}`, 'PUT', `/restaurants/${slug}/legal-pages/${type}`, fields);
  }
}

/** Lee el api y comprueba que tiene todo lo que hay en Sanity. Devuelve las diferencias. */
async function verify(source: Source, published: boolean): Promise<string[]> {
  const diffs: string[] = [];
  const check = (where: string, expected: unknown, actual: unknown) => {
    if (canonical(expected) !== canonical(actual)) diffs.push(`${where}: se esperaba ${JSON.stringify(expected)} y hay ${JSON.stringify(actual)}`);
  };
  const { restaurant: r } = source;
  const def = r.defaultLocaleCode;

  // Con lo publicado, se compara lo que leerá la landing; si no, lo guardado.
  const site: Doc | null = published ? await api('GET', `/public/restaurants/${slug}`) : null;
  const rest: Doc = site ? site.restaurant : (await api('GET', `/restaurants/${slug}`)).restaurant;
  for (const [k, v] of Object.entries(r.content)) check(`ficha.${k}`, v, rest[k]);
  check('ficha.idioma principal', def, rest.defaultLocale);
  check('ficha.idiomas', [...r.activeLocaleCodes].sort(), [...rest.activeLocales].sort());

  const spaces: Doc[] = site ? site.spaces : (await api('GET', `/restaurants/${slug}/spaces`)).spaces;
  const allDishes: Doc[] = site ? [] : (await api('GET', `/dishes?restaurantSlug=${slug}`)).dishes;
  const allWines: Doc[] = site ? [] : (await api('GET', `/wines?restaurantSlug=${slug}`)).wines;
  const allDrinks: Doc[] = site ? [] : (await api('GET', `/dishes?restaurantSlug=${slug}&kind=drink`)).dishes;
  check('espacios', source.spaces.map(s => s.slug), spaces.filter(s => source.spaces.some(e => e.slug === s.slug)).map(s => s.slug));

  for (const space of source.spaces) {
    const s = spaces.find(x => x.slug === space.slug);
    if (!s) continue;
    const at = `espacio «${space.slug}»`;
    check(`${at}.nombre`, space.name, s.name);
    check(`${at}.tipo`, space.type, s.type);
    for (const [k, v] of Object.entries(space.content)) check(`${at}.${k}`, v, s[k]);
    check(`${at}.horario`, space.schedule, s.schedule);

    for (const carta of ['dishes', 'drinks', 'wines'] as const) {
      const { base, query } = CARTA[carta];
      const kind = carta;
      const cats = carta === 'dishes' ? space.dishCategories : carta === 'drinks' ? space.drinkCategories : space.wineCategories;
      const items: (DishImport | WineImport)[] = carta === 'dishes' ? space.dishes : carta === 'drinks' ? space.drinks : space.wines;
      // Forma común: categorías en orden, cada una con sus elementos en orden.
      const shape = (item: Doc) => carta !== 'wines'
        ? { name: item.name, note: item.note ?? {}, price: item.price ?? null }
        : { name: item.name, region: item.region ?? null, note: item.note ?? {}, priceGlass: item.priceGlass ?? null, priceBottle: item.priceBottle ?? null };
      const expected = cats
        .map(c => ({
          name: c.name,
          items: items.filter(i => i.categorySourceId === c.sourceId && (!site || i.active)).sort((a, b) => a.order - b.order).map(shape)
        }))
        // Lo público no enseña categorías sin nada activo.
        .filter(c => !site || c.items.length > 0);
      let actual: { name: unknown; items: unknown[] }[];
      if (site) {
        const list: Doc[] = carta === 'dishes' ? s.dishCategories : carta === 'drinks' ? s.drinkCategories : s.wineCategories;
        actual = list.map(c => ({ name: c.name, items: (c[kind] as Doc[]).map(shape) }));
      } else {
        const apiCats = ((await api('GET', `/${base}/categories?spaceId=${s.id}${query}`)).categories as Doc[]).sort((a, b) => a.order - b.order);
        const apiItems = (carta === 'dishes' ? allDishes : carta === 'drinks' ? allDrinks : allWines).filter(i => i.spaceId === s.id);
        const wanted = new Set(cats.map(c => keyOf(c.name, def)));
        actual = apiCats
          .filter(c => wanted.has(keyOf(c.name ?? {}, def)))
          .map(c => ({ name: c.name, items: apiItems.filter(i => i.categoryId === c.id).sort((a, b) => a.order - b.order).map(shape) }));
        // Lo que está inactivo en Sanity tiene que estarlo también en el api.
        const inactive = items.filter(i => !i.active).length;
        const apiInactive = apiItems.filter(i => !i.active).length;
        if (!PRUNE ? apiInactive < inactive : apiInactive !== inactive) diffs.push(`${at}.${kind}: ${inactive} inactivos en Sanity y ${apiInactive} en el api`);
      }
      if (expected.length !== actual.length) {
        diffs.push(`${at}.${kind}: ${expected.length} categorías en Sanity y ${actual.length} en el api`);
        continue;
      }
      expected.forEach((c, i) => {
        check(`${at}.${kind}.categoría ${i + 1}`, c.name, actual[i].name);
        if (c.items.length !== actual[i].items.length) diffs.push(`${at}.${kind}.categoría ${i + 1}: ${c.items.length} en Sanity y ${actual[i].items.length} en el api`);
        else c.items.forEach((item, j) => check(`${at}.${kind}.categoría ${i + 1}.${j + 1}`, item, actual[i].items[j]));
      });
    }
  }

  const legal: Doc[] = site ? site.legalPages : (await api('GET', `/restaurants/${slug}/legal-pages`)).legalPages;
  for (const page of source.legalPages) {
    const found = legal.find(p => p.type === page.type);
    check(`legal.${page.type}`, page, found ? { type: found.type, title: found.title, content: found.content, lastUpdated: found.lastUpdated } : null);
  }
  return diffs;
}

async function publish(source: Source) {
  console.log('Publicar');
  const spaces = (await api('GET', `/restaurants/${slug}/spaces`)).spaces as Doc[];
  for (const space of source.spaces) {
    const s = spaces.find(x => x.slug === space.slug);
    if (s && s.state !== 'published') await write(`espacio «${space.slug}»: publicar`, 'PATCH', `/restaurants/${slug}/spaces/${s.id}`, { state: 'published' });
  }
  const r = (await api('GET', `/restaurants/${slug}`)).restaurant as Doc;
  if (r.state !== 'published') await write('ficha: publicar', 'PATCH', `/restaurants/${slug}`, { state: 'published' });
}

function summary(source: Source) {
  const count = (pick: (s: Source['spaces'][number]) => unknown[]) => source.spaces.reduce((n, s) => n + pick(s).length, 0);
  return `${source.spaces.length} espacio(s), ${count(s => s.dishCategories)} categorías de platos con ${count(s => s.dishes)} platos, ` +
    `${count(s => s.wineCategories)} de vinos con ${count(s => s.wines)} vinos, ${count(s => s.drinkCategories)} de bebidas con ${count(s => s.drinks)} bebidas, ${source.legalPages.length} páginas legales, ` +
    `idiomas ${source.restaurant.activeLocaleCodes.join('/')} (principal ${source.restaurant.defaultLocaleCode})`;
}

async function main() {
  console.log(`Sanity ${PROJECT}/${DATASET} → ${API_URL} · restaurante «${slug}» · ${APPLY ? 'APLICANDO' : 'en seco (sin escribir)'}`);
  const source = await readSource();
  console.log(`En Sanity: ${summary(source)}\n`);

  await sync(source);
  const synced = writes;
  if (APPLY && PUBLISH) await publish(source);

  if (warnings.length > 0) {
    console.log('\nAvisos');
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  if (!APPLY) {
    console.log(`\n${synced === 0 ? 'Nada que cambiar: el api ya tiene todo lo de Sanity.' : `${synced} cambios pendientes. Repite con --apply para hacerlos.`}`);
    if (synced > 0) return;
  } else {
    console.log(`\n${writes} cambios hechos.`);
  }

  const saved = await verify(source, false);
  const site = PUBLISH || (await api('GET', `/restaurants/${slug}`)).restaurant.state === 'published' ? await verify(source, true) : null;
  const report = (title: string, diffs: string[]) => {
    console.log(`${title}: ${diffs.length === 0 ? 'todo lo de Sanity está en el api' : `${diffs.length} diferencias`}`);
    for (const d of diffs) console.log(`  ✗ ${d}`);
  };
  report('Comprobación de lo guardado', saved);
  if (site) report('Comprobación de lo publicado (lectura pública)', site);
  if (saved.length > 0 || (site?.length ?? 0) > 0) process.exit(1);
}

main().catch(e => fail(e instanceof Error ? e.stack ?? e.message : String(e)));
