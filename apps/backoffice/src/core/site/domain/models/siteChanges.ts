import type { I18nValue } from '@/core/shared/domain';
import type { Dish, DishCategory, DishKind, Wine, WineCategory } from '@/core/menu/domain';
import type { LegalPage, LegalPageType } from '@/core/legal/domain';
import type { Space } from '@/core/spaces/domain';
import type { PublishedSiteSources } from './publishedSite';

/**
 * Qué ha cambiado en el backoffice desde el último «Publicar», en lo que no tiene
 * borrador propio (carta, vinos, legales y espacios): se compara con la copia publicada.
 * Solo cuenta lo que cambia la web: un plato oculto que se edita no es un cambio.
 */
export interface RowChange {
  status: 'new' | 'changed';
  /** Precios de la web de ahora, si han cambiado: «Antes: 12,00 €». */
  before?: { price?: number | null; priceGlass?: number | null; priceBottle?: number | null };
}

export interface RemovedRow {
  kind: DishKind | 'wine';
  id: string;
  spaceId: string;
  categoryId: string;
  categoryName: I18nValue;
  name: I18nValue | string;
  price: number | null;
}

export interface SiteChanges {
  /** Sin copia (nunca publicado) no hay nada con qué comparar: no hay marcas. */
  hasCopy: boolean;
  /** Por id de plato, vino o categoría. */
  rows: Record<string, RowChange>;
  /** Lo que la web enseña y en el backoffice ya no existe: se quitará al publicar. */
  removed: RemovedRow[];
  legal: LegalPageType[];
  spaces: { order: boolean; isDefault: boolean; removed: { id: string; name: string }[] };
  /** Espacios cuya carta (platos, bebidas o vinos) tiene cambios. */
  menuSpaceIds: string[];
}

type Sources = Pick<PublishedSiteSources, 'spaces' | 'dishCategories' | 'dishes' | 'wineCategories' | 'wines' | 'legalPages'>;

/** JSON con las claves ordenadas: jsonb no conserva el orden. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
    : v));
}

const dishView = (d: Dish) => (d.active ? { categoryId: d.categoryId, name: d.name, note: d.note ?? {}, price: d.price, imageAssetId: d.imageAssetId } : null);
const wineView = (w: Wine) => (w.active ? { categoryId: w.categoryId, name: w.name, region: w.region, note: w.note ?? {}, priceGlass: w.priceGlass, priceBottle: w.priceBottle } : null);
const legalView = (p: LegalPage) => ({ title: p.title, content: p.content, lastUpdated: p.lastUpdated });

/** Ids de las filas visibles de cada grupo, en su orden: lo que la web enseña y cómo. */
function visibleOrder<T extends { id: string; order: number }>(rows: T[], groupOf: (row: T) => string, visible: (row: T) => boolean): Map<string, string[]> {
  const out = new Map<string, string[]>();
  // Con el mismo número de orden, el id decide: si no, dos listas iguales podrían salir distintas.
  for (const row of [...rows].filter(visible).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
    const key = groupOf(row);
    out.set(key, [...(out.get(key) ?? []), row.id]);
  }
  return out;
}

export function computeSiteChanges(draft: Sources, copy: Sources | null): SiteChanges {
  const empty: SiteChanges = { hasCopy: false, rows: {}, removed: [], legal: [], spaces: { order: false, isDefault: false, removed: [] }, menuSpaceIds: [] };
  if (!copy) return empty;
  const changes: SiteChanges = { ...empty, hasCopy: true };
  const menuSpaces = new Set<string>();
  // Solo cuenta la carta de los espacios que la web enseña.
  const onWeb = new Set(copy.spaces.map(s => s.id));
  const mark = (id: string, spaceId: string, change: RowChange) => { changes.rows[id] = change; menuSpaces.add(spaceId); };

  const compareItems = <T extends Dish | Wine>(drafts: T[], published: T[], view: (row: T) => object | null, prices: (row: T) => RowChange['before']) => {
    const before = new Map(published.map(row => [row.id, row]));
    for (const row of drafts) {
      if (!onWeb.has(row.spaceId)) continue;
      const was = before.get(row.id);
      const now = view(row);
      const then = was ? view(was) : null;
      if (stable(now) === stable(then)) continue;
      if (!then) { if (now) mark(row.id, row.spaceId, { status: 'new' }); continue; }
      const priceChanged = now && stable(prices(row)) !== stable(prices(was!));
      mark(row.id, row.spaceId, { status: 'changed', ...(priceChanged ? { before: prices(was!) } : {}) });
    }
  };
  compareItems(draft.dishes, copy.dishes, dishView, d => ({ price: d.price }));
  compareItems(draft.wines, copy.wines, wineView, w => ({ priceGlass: w.priceGlass, priceBottle: w.priceBottle }));

  // Lo que la web enseña y ya no está en el backoffice.
  const draftIds = new Set([...draft.dishes.map(d => d.id), ...draft.wines.map(w => w.id)]);
  const dishCategory = new Map(copy.dishCategories.map(c => [c.id, c]));
  const wineCategory = new Map(copy.wineCategories.map(c => [c.id, c]));
  const liveSpaces = new Set(draft.spaces.map(s => s.id));
  for (const d of copy.dishes) {
    if (draftIds.has(d.id) || !d.active || !liveSpaces.has(d.spaceId)) continue;
    const cat = dishCategory.get(d.categoryId);
    changes.removed.push({ kind: cat?.kind ?? 'dish', id: d.id, spaceId: d.spaceId, categoryId: d.categoryId, categoryName: cat?.name ?? {}, name: d.name, price: d.price });
    menuSpaces.add(d.spaceId);
  }
  for (const w of copy.wines) {
    if (draftIds.has(w.id) || !w.active || !liveSpaces.has(w.spaceId)) continue;
    changes.removed.push({ kind: 'wine', id: w.id, spaceId: w.spaceId, categoryId: w.categoryId, categoryName: wineCategory.get(w.categoryId)?.name ?? {}, name: w.name, price: w.priceBottle ?? w.priceGlass });
    menuSpaces.add(w.spaceId);
  }

  // Categorías: nombre nuevo, o cambia el orden de las categorías o de lo que tienen dentro.
  const compareCategories = <C extends DishCategory | WineCategory, I extends Dish | Wine>(
    drafts: C[], published: C[], draftItems: I[], publishedItems: I[], groupOf: (c: C) => string
  ) => {
    const visibleIn = (items: I[]) => new Set(items.filter(i => i.active).map(i => i.categoryId));
    const draftVisible = visibleIn(draftItems);
    const publishedVisible = visibleIn(publishedItems);
    const draftOrder = visibleOrder(drafts, groupOf, c => draftVisible.has(c.id));
    const publishedOrder = visibleOrder(published, groupOf, c => publishedVisible.has(c.id));
    const itemsDraft = visibleOrder(draftItems, i => i.categoryId, i => i.active);
    const itemsPublished = visibleOrder(publishedItems, i => i.categoryId, i => i.active);
    const before = new Map(published.map(c => [c.id, c]));
    for (const c of drafts) {
      if (!onWeb.has(c.spaceId) || changes.rows[c.id]) continue;
      const was = before.get(c.id);
      const shownNow = draftVisible.has(c.id);
      const shownThen = !!was && publishedVisible.has(c.id);
      if (!shownNow && !shownThen) continue;
      if (!shownThen) { mark(c.id, c.spaceId, { status: 'new' }); continue; }
      const group = groupOf(c);
      const moved = (draftOrder.get(group) ?? []).indexOf(c.id) !== (publishedOrder.get(group) ?? []).indexOf(c.id);
      const inside = stable(itemsDraft.get(c.id) ?? []) !== stable(itemsPublished.get(c.id) ?? []);
      if (!shownNow || moved || inside || stable(c.name) !== stable(was!.name)) mark(c.id, c.spaceId, { status: 'changed' });
    }
  };
  compareCategories(draft.dishCategories, copy.dishCategories, draft.dishes, copy.dishes, c => `${c.spaceId}:${c.kind}`);
  compareCategories(draft.wineCategories, copy.wineCategories, draft.wines, copy.wines, c => c.spaceId);

  // Textos legales.
  const legalBefore = new Map(copy.legalPages.map(p => [p.type, p]));
  for (const p of draft.legalPages) {
    const was = legalBefore.get(p.type);
    if (!was || stable(legalView(p)) !== stable(legalView(was))) changes.legal.push(p.type);
  }

  // Espacios: orden, cuál es el principal y los borrados.
  const order = (spaces: Space[]) => [...spaces].filter(s => onWeb.has(s.id)).sort((a, b) => a.order - b.order).map(s => s.id);
  changes.spaces.order = stable(order(draft.spaces)) !== stable(order(copy.spaces).filter(id => liveSpaces.has(id)));
  const defaultOf = (spaces: Space[]) => spaces.find(s => s.isDefault)?.id ?? null;
  changes.spaces.isDefault = defaultOf(draft.spaces) !== defaultOf(copy.spaces);
  changes.spaces.removed = copy.spaces.filter(s => !liveSpaces.has(s.id)).map(s => ({ id: s.id, name: s.name }));

  changes.menuSpaceIds = [...menuSpaces];
  return changes;
}
