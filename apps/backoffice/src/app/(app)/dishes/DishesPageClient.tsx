'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import type { MediaAsset, SiteChanges } from '@hosteleria/api-client';
import { CategoryDialog } from '@/components/menu/CategoryDialog';
import { DishSheet } from '@/components/menu/DishSheet';
import { MenuList, type MenuRow, type RemovedMenuRow } from '@/components/menu/MenuList';
import { WineSheet } from '@/components/menu/WineSheet';
import { categoryLabel, type MenuCategory, type MenuKind, type MenuScope } from '@/components/menu/types';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { formatPrice } from '@/lib/forms/price';
import { missingLocales } from '@/lib/forms/translations';
import {
  useDeleteDishCategory, useDeleteWineCategory, useDishCategories, useDishes, useLanguages, useMediaList, useRestaurants,
  useReorderMenu, useRestorePublishedRow, useSetDishActive, useSetWineActive, useSiteChanges, useSpaces, useWineCategories, useWines
} from '@/lib/query/hooks';

type Visibility = 'all' | 'visible' | 'hidden' | 'missing';
type Editing = { type: 'item'; id: string | null; categoryId?: string } | { type: 'category'; category: MenuCategory | null } | null;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const priceText = (price: number | null) => (price !== null ? formatPrice(price) : 'Sin precio');
const winePrice = (glass: number | null, bottle: number | null) =>
  [glass !== null ? `${formatPrice(glass)} copa` : null, bottle !== null ? `${formatPrice(bottle)} botella` : null].filter(Boolean).join(' · ') || 'Sin precio';

/** Cada parte de la carta: su título, su ancla y cómo se nombra lo que lleva dentro. */
const KINDS: Record<MenuKind, { title: string; anchor: string; noun: string; plural: string; example: string }> = {
  dishes: { title: 'Platos', anchor: 'carta-platos', noun: 'plato', plural: 'platos', example: '«Entrantes»' },
  wines: { title: 'Vinos', anchor: 'carta-vinos', noun: 'vino', plural: 'vinos', example: '«Tintos»' },
  drinks: { title: 'Bebidas', anchor: 'carta-bebidas', noun: 'bebida', plural: 'bebidas', example: '«Cafés»' }
};

interface Props {
  /** Dentro del editor de la web: restaurante y espacio fijos, sin cabecera ni selectores. */
  slug?: string;
  spaceId?: string;
  embedded?: boolean;
}

/**
 * La carta de un espacio en una sola lista: platos, vinos y bebidas uno debajo de otro,
 * con saltos rápidos arriba y una búsqueda para todo. Los cambios salen al publicar.
 */
export function DishesPageClient({ slug: fixedSlug, spaceId: fixedSpaceId, embedded = false }: Props = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const restaurantsQuery = useRestaurants();
  const restaurants = restaurantsQuery.data ?? [];
  const restaurant = restaurants.find(r => r.slug === (fixedSlug ?? params.get('r'))) ?? (fixedSlug ? undefined : restaurants[0]);
  const slug = restaurant?.slug ?? '';

  const spacesQuery = useSpaces(slug);
  const spaces = spacesQuery.data ?? [];
  const space = spaces.find(s => s.id === (fixedSpaceId ?? params.get('e'))) ?? spaces.find(s => s.isDefault) ?? spaces[0];
  const spaceId = space?.id ?? '';

  const { data: languages = [] } = useLanguages();
  // Solo para las miniaturas de la lista: si falla, la carta se ve igual sin ellas.
  const { data: media } = useMediaList({ restaurantSlug: slug });
  // Lo que ha cambiado desde el último «Publicar»: marcas «Sin publicar» y lo que se quitará.
  const { data: changes } = useSiteChanges(slug);
  const drinksQuery = useDishes({ restaurantSlug: slug, kind: 'drink' });
  const drinkCategoriesQuery = useDishCategories(spaceId || undefined, 'drink');

  const [search, setSearch] = useState('');
  // Desde «Pendiente» se llega con la lista ya filtrada por lo que falta traducir.
  const [visibility, setVisibility] = useState<Visibility>(() => (params.get('ver') === 'sin-traducir' ? 'missing' : 'all'));
  const [drinksOffered, setDrinksOffered] = useState(false);
  // Resultados de cada parte con un filtro activo, para decir cuántos hay en total.
  const [found, setFound] = useState<Partial<Record<MenuKind, number>>>({});
  const onFound = useCallback((kind: MenuKind, n: number) => setFound(prev => (prev[kind] === n ? prev : { ...prev, [kind]: n })), []);

  const locales = (restaurant?.activeLocales ?? []) as string[];
  const defaultLocale = (restaurant?.defaultLocale ?? 'es') as string;
  const localeNames = useMemo(() => Object.fromEntries(languages.map(l => [l.code as string, l.name])), [languages]);
  const scope: MenuScope = { restaurantSlug: slug, spaceId, locales, defaultLocale, localeNames };

  // La carta de bebidas solo sale donde ya se usa: la mayoría de las webs no la enseñan.
  const tipo = params.get('tipo');
  const hasDrinks = drinksOffered || tipo === 'bebidas'
    || (drinksQuery.data ?? []).some(d => d.spaceId === spaceId) || (drinkCategoriesQuery.data ?? []).length > 0;
  const kinds: MenuKind[] = hasDrinks ? ['dishes', 'wines', 'drinks'] : ['dishes', 'wines'];

  // Desde un aviso de «los vinos» o «las bebidas» se llega a su parte de la lista.
  useEffect(() => {
    const kind = tipo === 'vinos' ? 'wines' : tipo === 'bebidas' ? 'drinks' : null;
    if (!kind || !spaceId) return;
    const t = setTimeout(() => document.getElementById(KINDS[kind].anchor)?.scrollIntoView({ block: 'start' }), 300);
    return () => clearTimeout(t);
  }, [tipo, spaceId]);

  const setParam = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v === null ? q.delete(k) : q.set(k, v)));
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtering = search.trim() !== '' || visibility !== 'all';

  return (
    <>
      {!embedded && (
        <PageHeader title="Carta">
          Los platos, vinos y bebidas de cada espacio, agrupados por categoría.{' '}
          Los cambios se guardan solos y <strong className="font-semibold text-[color:var(--color-ink)]">salen en tu web al pulsar «Publicar cambios»</strong>.
        </PageHeader>
      )}

      <QueryBoundary queries={[restaurantsQuery, spacesQuery]}>
        {!restaurant ? (
          <EmptyState title="Todavía no tienes ningún restaurante asignado">Pide a un administrador que te dé acceso al tuyo.</EmptyState>
        ) : (
          <>
            {!embedded && (restaurants.length > 1 || spaces.length > 1) && (
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-[640px]">
                {restaurants.length > 1 && (
                  <Field id="carta-restaurante" label="Restaurante">
                    {control => (
                      <Select {...control} value={slug} onChange={e => setParam({ r: e.target.value, e: null })}>
                        {restaurants.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
                      </Select>
                    )}
                  </Field>
                )}
                {spaces.length > 1 && (
                  <Field id="carta-espacio" label="Espacio">
                    {control => (
                      <Select {...control} value={spaceId} onChange={e => setParam({ e: e.target.value })}>
                        {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    )}
                  </Field>
                )}
              </div>
            )}

            {!space ? (
              <EmptyState title={`${restaurant.name} aún no tiene espacios`}>
                La carta se organiza por espacio. Cuando exista uno, podrás añadir aquí sus platos y vinos.
              </EmptyState>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:max-w-[320px] sm:flex-1">
                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
                    <TextInput id="carta-buscar" type="search" autoComplete="off" aria-label="Buscar en la carta" placeholder="Buscar en la carta" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select id="carta-mostrar" aria-label="Mostrar" className="w-auto min-w-[150px]" value={visibility} onChange={e => setVisibility(e.target.value as Visibility)}>
                    <option value="all">Todos</option>
                    <option value="visible">Solo visibles</option>
                    <option value="hidden">Solo ocultos</option>
                    {locales.length > 1 && <option value="missing">Falta traducción</option>}
                  </Select>
                  <nav aria-label="Partes de la carta" className="ml-auto">
                    <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
                      {kinds.map(kind => (
                        <li key={kind}>
                          <a
                            href={`#${KINDS[kind].anchor}`}
                            className="inline-flex min-h-11 items-center rounded-[8px] px-3 text-[14px] font-semibold text-[color:var(--color-ink-soft)] underline-offset-4 hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)] hover:underline sm:min-h-9"
                          >
                            {KINDS[kind].title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                <p role="status" className={filtering ? 'mb-4 mt-0 text-[13.5px] text-[color:var(--color-muted)]' : 'sr-only'}>
                  {filtering ? (() => { const n = kinds.reduce((sum, k) => sum + (found[k] ?? 0), 0); return n === 1 ? '1 resultado' : `${n} resultados`; })() : ''}
                </p>

                <div className="flex flex-col gap-12">
                  {kinds.map(kind => (
                    <MenuKindSection
                      key={`${kind}:${spaceId}`}
                      kind={kind}
                      scope={scope}
                      search={search}
                      visibility={visibility}
                      filtering={filtering}
                      media={media}
                      changes={changes}
                      embedded={embedded}
                      onFound={onFound}
                    />
                  ))}
                </div>

                {!hasDrinks && !filtering && (
                  <div className="mt-10 border-t border-[color:var(--color-border)] pt-6">
                    <Button variant="ghost" onClick={() => setDrinksOffered(true)}>
                      <Plus aria-hidden className="h-4 w-4" />
                      Añadir una carta de bebidas
                    </Button>
                    <p className="m-0 mt-1 text-[13.5px] text-[color:var(--color-muted)]">Cafés, refrescos, cócteles… con sus precios, aparte de los platos.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </QueryBoundary>
    </>
  );
}

interface KindProps {
  kind: MenuKind;
  scope: MenuScope;
  search: string;
  visibility: Visibility;
  filtering: boolean;
  media?: MediaAsset[];
  changes?: SiteChanges;
  embedded: boolean;
  onFound: (kind: MenuKind, n: number) => void;
}

/** Una parte de la carta (platos, vinos o bebidas) con sus categorías, filas y diálogos. */
function MenuKindSection({ kind, scope, search, visibility, filtering, media, changes, embedded, onFound }: KindProps) {
  const { restaurantSlug: slug, spaceId, locales, defaultLocale } = scope;
  const info = KINDS[kind];
  const isWines = kind === 'wines';

  const dishesQuery = useDishes({ restaurantSlug: slug, ...(kind === 'drinks' ? { kind: 'drink' as const } : {}) });
  const winesQuery = useWines({ restaurantSlug: slug });
  const dishCategoriesQuery = useDishCategories(spaceId || undefined, kind === 'drinks' ? 'drink' : undefined);
  const wineCategoriesQuery = useWineCategories(spaceId || undefined);
  const itemsQuery = isWines ? winesQuery : dishesQuery;
  const categoriesQuery = isWines ? wineCategoriesQuery : dishCategoriesQuery;

  const setDishActive = useSetDishActive();
  const setWineActive = useSetWineActive();
  const deleteDishCategory = useDeleteDishCategory();
  const deleteWineCategory = useDeleteWineCategory();
  const reorder = useReorderMenu();
  const restoreRow = useRestorePublishedRow(slug);
  // Las bebidas son platos de otra carta: comparten rutas.
  const reorderMenu = isWines ? 'wines' as const : 'dishes' as const;

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const dishes = useMemo(() => (dishesQuery.data ?? []).filter(d => d.spaceId === spaceId), [dishesQuery.data, spaceId]);
  const wines = useMemo(() => (winesQuery.data ?? []).filter(w => w.spaceId === spaceId), [winesQuery.data, spaceId]);
  const categories: MenuCategory[] = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [categoriesQuery.data]
  );

  const allRows: MenuRow[] = useMemo(() => {
    // Idiomas en los que falta algún texto del elemento (nombre o descripción).
    const missingOf = (...texts: (Record<string, string | undefined> | null | undefined)[]) =>
      locales.filter(code => texts.some(text => missingLocales(text, locales).includes(code)));
    const changeOf = (id: string) => changes?.rows[id];
    if (!isWines) {
      return [...dishes].sort((a, b) => a.order - b.order).map(d => ({
        id: d.id,
        categoryId: d.categoryId,
        name: d.name[defaultLocale] ?? Object.values(d.name).find(Boolean) ?? 'Sin nombre',
        detail: d.note?.[defaultLocale],
        price: priceText(d.price),
        active: d.active,
        missing: missingOf(d.name, d.note),
        imageUrl: d.imageAssetId ? media?.find(m => m.id === d.imageAssetId)?.publicUrl : undefined,
        unpublished: !!changeOf(d.id),
        pricedBefore: changeOf(d.id)?.before ? priceText(changeOf(d.id)!.before!.price ?? null) : undefined
      }));
    }
    return [...wines].sort((a, b) => a.order - b.order).map(w => ({
      id: w.id,
      categoryId: w.categoryId,
      name: w.name,
      detail: w.region ?? undefined,
      price: winePrice(w.priceGlass, w.priceBottle),
      active: w.active,
      // El nombre de un vino no se traduce; su nota, sí.
      missing: missingOf(w.note),
      unpublished: !!changeOf(w.id),
      pricedBefore: changeOf(w.id)?.before ? winePrice(changeOf(w.id)!.before!.priceGlass ?? null, changeOf(w.id)!.before!.priceBottle ?? null) : undefined
    }));
  }, [isWines, dishes, wines, locales, defaultLocale, media, changes]);

  const removed: RemovedMenuRow[] = useMemo(() => {
    const wanted = isWines ? 'wine' : kind === 'drinks' ? 'drink' : 'dish';
    return (changes?.removed ?? [])
      .filter(r => r.spaceId === spaceId && r.kind === wanted)
      .map(r => ({
        id: r.id,
        categoryId: r.categoryId,
        name: typeof r.name === 'string' ? r.name : r.name[defaultLocale] ?? Object.values(r.name).find(Boolean) ?? 'Sin nombre',
        price: priceText(r.price)
      }));
  }, [changes, isWines, kind, spaceId, defaultLocale]);
  const unpublishedCategories = useMemo(() => new Set(categories.filter(c => changes?.rows[c.id]).map(c => c.id)), [categories, changes]);

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    allRows.forEach(r => { out[r.categoryId] = (out[r.categoryId] ?? 0) + 1; });
    return out;
  }, [allRows]);

  const rows = allRows.filter(r => {
    if (search.trim() && !normalize(r.name).includes(normalize(search.trim()))) return false;
    if (visibility === 'visible') return r.active;
    if (visibility === 'hidden') return !r.active;
    if (visibility === 'missing') return r.missing.length > 0;
    return true;
  });

  useEffect(() => { onFound(kind, rows.length); }, [onFound, kind, rows.length]);

  const editingItem = editing?.type === 'item' ? editing : null;
  const nextItemOrder = (categoryId?: string) => allRows.filter(r => r.categoryId === categoryId).length;
  const Heading = embedded ? 'h3' : 'h2';
  const headingId = `${info.anchor}-titulo`;

  return (
    <section id={info.anchor} aria-labelledby={headingId} className="scroll-mt-40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] pb-3">
        <Heading id={headingId} className="m-0 text-[19px] font-bold tracking-[-0.015em]">
          {info.title} <span className="tabular text-[15px] font-medium text-[color:var(--color-muted)]">· {allRows.length}</span>
        </Heading>
        <div className="flex gap-2">
          <Button variant="ghost" aria-label={`Añadir categoría de ${info.plural}`} onClick={() => setEditing({ type: 'category', category: null })}>
            <Plus aria-hidden className="h-4 w-4" />
            <span><span className="hidden sm:inline">Añadir </span>categoría</span>
          </Button>
          {categories.length > 0 && (
            <Button variant="primary" onClick={() => setEditing({ type: 'item', id: null })}>
              <Plus aria-hidden className="h-4 w-4" />
              Añadir {info.noun}
            </Button>
          )}
        </div>
      </div>

      <QueryBoundary queries={[itemsQuery, categoriesQuery]}>
        {categories.length === 0 ? (
          filtering ? null : (
            <EmptyState title={kind === 'dishes' ? 'Esta carta aún no tiene categorías' : `Aún no hay categorías de ${info.plural}`}>
              Empieza creando una, por ejemplo {info.example}. Después podrás añadir {info.plural} dentro.
            </EmptyState>
          )
        ) : filtering && rows.length === 0 ? (
          <p className="m-0 text-[13.5px] text-[color:var(--color-muted)]">Nada coincide con lo que buscas.</p>
        ) : (
          <MenuList
            categories={categories}
            locales={locales}
            rows={rows}
            totals={totals}
            filtering={filtering}
            defaultLocale={defaultLocale}
            itemNoun={info.noun}
            categoryHeading={embedded ? 'h4' : 'h3'}
            onAdd={categoryId => setEditing({ type: 'item', id: null, categoryId })}
            onEdit={id => setEditing({ type: 'item', id })}
            onToggle={(id, active) => (isWines ? setWineActive : setDishActive).mutate({ id, active })}
            onRenameCategory={category => setEditing({ type: 'category', category })}
            onDeleteCategory={setDeleting}
            onReorderItems={ids => reorder.mutate({ menu: reorderMenu, level: 'items', ids })}
            onReorderCategories={ids => reorder.mutate({ menu: reorderMenu, level: 'categories', ids })}
            unpublishedCategories={unpublishedCategories}
            removed={removed}
            onRestore={id => restoreRow.mutateAsync({ kind: isWines ? 'wine' : 'dish', id }).then(() => showSuccessToast('Recuperado'), () => {})}
          />
        )}
      </QueryBoundary>

      {editingItem && !isWines && (
        <DishSheet
          key={editingItem.id ?? 'nuevo'}
          scope={scope}
          drink={kind === 'drinks'}
          categories={dishCategoriesQuery.data ?? []}
          dish={editingItem.id ? dishes.find(d => d.id === editingItem.id) ?? null : null}
          initialCategoryId={editingItem.categoryId}
          nextOrder={nextItemOrder(editingItem.categoryId ?? categories[0]?.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {editingItem && isWines && (
        <WineSheet
          key={editingItem.id ?? 'nuevo'}
          scope={scope}
          categories={wineCategoriesQuery.data ?? []}
          wine={editingItem.id ? wines.find(w => w.id === editingItem.id) ?? null : null}
          initialCategoryId={editingItem.categoryId}
          nextOrder={nextItemOrder(editingItem.categoryId ?? categories[0]?.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.type === 'category' && (
        <CategoryDialog kind={kind} scope={scope} category={editing.category} nextOrder={categories.length} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => { if (!open) setDeleting(null); }}
        title={deleting ? `¿Eliminar la categoría «${categoryLabel(deleting, defaultLocale)}»?` : ''}
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando…"
        pending={deleteDishCategory.isPending || deleteWineCategory.isPending}
        onConfirm={() => {
          if (!deleting) return;
          (isWines ? deleteWineCategory : deleteDishCategory)
            .mutateAsync(deleting.id)
            .then(() => { showSuccessToast('Categoría eliminada'); setDeleting(null); }, () => {});
        }}
      >
        <p className="m-0">Está vacía, así que no se pierde {kind === 'drinks' ? 'ninguna' : 'ningún'} {info.noun}. Si sale en tu web, se quitará al publicar.</p>
      </ConfirmDialog>
    </section>
  );
}
