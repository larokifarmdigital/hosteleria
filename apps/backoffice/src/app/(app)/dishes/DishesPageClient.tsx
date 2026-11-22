'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { CategoryDialog } from '@/components/menu/CategoryDialog';
import { DishSheet } from '@/components/menu/DishSheet';
import { MenuList, type MenuRow } from '@/components/menu/MenuList';
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
import { cn } from '@/lib/utils';
import {
  useDeleteDishCategory, useDeleteWineCategory, useDishCategories, useDishes, useLanguages, useMediaList, useRestaurants,
  useSetDishActive, useSetWineActive, useSpaces, useWineCategories, useWines
} from '@/lib/query/hooks';

type Visibility = 'all' | 'visible' | 'hidden' | 'missing';
type Editing = { type: 'item'; id: string | null; categoryId?: string } | { type: 'category'; category: MenuCategory | null } | null;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function DishesPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const restaurantsQuery = useRestaurants();
  const restaurants = restaurantsQuery.data ?? [];
  const restaurant = restaurants.find(r => r.slug === params.get('r')) ?? restaurants[0];
  const slug = restaurant?.slug ?? '';

  const spacesQuery = useSpaces(slug);
  const spaces = spacesQuery.data ?? [];
  const space = spaces.find(s => s.id === params.get('e')) ?? spaces.find(s => s.isDefault) ?? spaces[0];
  const spaceId = space?.id ?? '';

  const tipoParam = params.get('tipo');
  const kind: MenuKind = tipoParam === 'vinos' ? 'wines' : tipoParam === 'bebidas' ? 'drinks' : 'dishes';

  const dishesQuery = useDishes({ restaurantSlug: slug });
  const winesQuery = useWines({ restaurantSlug: slug });
  const dishCategoriesQuery = useDishCategories(spaceId || undefined);
  const drinksQuery = useDishes({ restaurantSlug: slug, kind: 'drink' });
  const drinkCategoriesQuery = useDishCategories(spaceId || undefined, 'drink');
  const wineCategoriesQuery = useWineCategories(spaceId || undefined);
  const { data: languages = [] } = useLanguages();
  // Solo para las miniaturas de la lista: si falla, la carta se ve igual sin ellas.
  const { data: media } = useMediaList({ restaurantSlug: slug });

  const setDishActive = useSetDishActive();
  const setWineActive = useSetWineActive();
  const deleteDishCategory = useDeleteDishCategory();
  const deleteWineCategory = useDeleteWineCategory();

  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const locales = (restaurant?.activeLocales ?? []) as string[];
  const defaultLocale = (restaurant?.defaultLocale ?? 'es') as string;
  const localeNames = useMemo(() => Object.fromEntries(languages.map(l => [l.code as string, l.name])), [languages]);
  const scope: MenuScope = { restaurantSlug: slug, spaceId, locales, defaultLocale, localeNames };

  const dishes = useMemo(() => (dishesQuery.data ?? []).filter(d => d.spaceId === spaceId), [dishesQuery.data, spaceId]);
  const wines = useMemo(() => (winesQuery.data ?? []).filter(w => w.spaceId === spaceId), [winesQuery.data, spaceId]);
  const drinks = useMemo(() => (drinksQuery.data ?? []).filter(d => d.spaceId === spaceId), [drinksQuery.data, spaceId]);
  // La carta de bebidas solo se ofrece donde ya se usa: la mayoría de las webs no la enseñan.
  const hasDrinks = kind === 'drinks' || (drinksQuery.data ?? []).length > 0 || (drinkCategoriesQuery.data ?? []).length > 0;
  const menu = kind === 'wines'
    ? { queries: [winesQuery, wineCategoriesQuery], categories: wineCategoriesQuery.data }
    : kind === 'drinks'
      ? { queries: [drinksQuery, drinkCategoriesQuery], categories: drinkCategoriesQuery.data }
      : { queries: [dishesQuery, dishCategoriesQuery], categories: dishCategoriesQuery.data };

  const categories: MenuCategory[] = useMemo(
    () => [...(menu.categories ?? [])].sort((a, b) => a.order - b.order),
    [menu.categories]
  );

  const allRows: MenuRow[] = useMemo(() => {
    // Idiomas en los que falta algún texto del elemento (nombre o descripción).
    const missingOf = (...texts: (Record<string, string | undefined> | null | undefined)[]) =>
      locales.filter(code => texts.some(text => missingLocales(text, locales).includes(code)));
    if (kind !== 'wines') {
      return [...(kind === 'drinks' ? drinks : dishes)].sort((a, b) => a.order - b.order).map(d => ({
        id: d.id,
        categoryId: d.categoryId,
        name: d.name[defaultLocale] ?? Object.values(d.name).find(Boolean) ?? 'Sin nombre',
        detail: d.note?.[defaultLocale],
        price: d.price !== null ? formatPrice(d.price) : 'Sin precio',
        active: d.active,
        missing: missingOf(d.name, d.note),
        imageUrl: d.imageAssetId ? media?.find(m => m.id === d.imageAssetId)?.publicUrl : undefined
      }));
    }
    return [...wines].sort((a, b) => a.order - b.order).map(w => ({
      id: w.id,
      categoryId: w.categoryId,
      name: w.name,
      detail: w.region ?? undefined,
      price: [w.priceGlass !== null ? `${formatPrice(w.priceGlass)} copa` : null, w.priceBottle !== null ? `${formatPrice(w.priceBottle)} botella` : null]
        .filter(Boolean).join(' · ') || 'Sin precio',
      active: w.active,
      // El nombre de un vino no se traduce; su nota, sí.
      missing: missingOf(w.note)
    }));
  }, [kind, dishes, drinks, wines, locales, defaultLocale, media]);

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    allRows.forEach(r => { out[r.categoryId] = (out[r.categoryId] ?? 0) + 1; });
    return out;
  }, [allRows]);

  const filtering = search.trim() !== '' || visibility !== 'all';
  const rows = allRows.filter(r => {
    if (search.trim() && !normalize(r.name).includes(normalize(search.trim()))) return false;
    if (visibility === 'visible') return r.active;
    if (visibility === 'hidden') return !r.active;
    if (visibility === 'missing') return r.missing.length > 0;
    return true;
  });

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const tabHref = (tipo: MenuKind) => {
    const next = new URLSearchParams(params.toString());
    if (tipo === 'wines') next.set('tipo', 'vinos'); else if (tipo === 'drinks') next.set('tipo', 'bebidas'); else next.delete('tipo');
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const itemNoun = kind === 'dishes' ? 'plato' : kind === 'wines' ? 'vino' : 'bebida';
  const itemPlural = kind === 'dishes' ? 'platos' : kind === 'wines' ? 'vinos' : 'bebidas';
  const editingItem = editing?.type === 'item' ? editing : null;
  const nextItemOrder = (categoryId?: string) => allRows.filter(r => r.categoryId === categoryId).length;

  return (
    <>
      <PageHeader title="Carta">{hasDrinks ? 'Los platos, vinos y bebidas' : 'Los platos y vinos'} de cada espacio, agrupados por categoría.</PageHeader>

      <QueryBoundary queries={[restaurantsQuery, spacesQuery]}>
        {!restaurant ? (
          <EmptyState title="Todavía no tienes ningún restaurante asignado">Pide a un administrador que te dé acceso al tuyo.</EmptyState>
        ) : (
          <>
            {(restaurants.length > 1 || spaces.length > 1) && (
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
                <nav aria-label="Tipo de carta" className="mb-5 border-b border-[color:var(--color-border)]">
                  <ul className="m-0 flex list-none gap-1 p-0">
                    {([['dishes', 'Platos', dishes.length], ['wines', 'Vinos', wines.length], ...(hasDrinks ? [['drinks', 'Bebidas', drinks.length] as const] : [])] as const).map(([tipo, label, count]) => (
                      <li key={tipo}>
                        <Link
                          href={tabHref(tipo)}
                          replace
                          scroll={false}
                          aria-current={kind === tipo ? 'page' : undefined}
                          className={cn(
                            '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-4 text-[14px] font-semibold transition-colors',
                            kind === tipo
                              ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                              : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
                          )}
                        >
                          {label}
                          <span className="tabular text-[12.5px] font-medium text-[color:var(--color-muted)]">{count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <QueryBoundary queries={menu.queries}>
                  {categories.length === 0 ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full">
                        <EmptyState title={kind === 'dishes' ? 'Esta carta aún no tiene categorías' : `Esta carta de ${itemPlural} aún no tiene categorías`}>
                          Empieza creando una, por ejemplo {kind === 'dishes' ? '«Entrantes»' : kind === 'wines' ? '«Tintos»' : '«Cafés»'}. Después podrás añadir {itemPlural} dentro.
                        </EmptyState>
                      </div>
                      <Button variant="primary" onClick={() => setEditing({ type: 'category', category: null })}>
                        <Plus aria-hidden className="h-4 w-4" />
                        Añadir categoría
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-5 flex flex-wrap items-end gap-4">
                        <Field id="carta-buscar" label={`Buscar ${itemNoun}`} className="min-w-[200px] flex-1 sm:max-w-[320px]">
                          {control => <TextInput {...control} type="search" autoComplete="off" value={search} onChange={e => setSearch(e.target.value)} />}
                        </Field>
                        <Field id="carta-mostrar" label="Mostrar" className="min-w-[180px]">
                          {control => (
                            <Select {...control} value={visibility} onChange={e => setVisibility(e.target.value as Visibility)}>
                              <option value="all">Todos</option>
                              <option value="visible">Solo visibles</option>
                              <option value="hidden">Solo ocultos</option>
                              {locales.length > 1 && <option value="missing">Falta traducción</option>}
                            </Select>
                          )}
                        </Field>
                        <div className="ml-auto flex gap-2.5">
                          <Button onClick={() => setEditing({ type: 'category', category: null })}>
                            <Plus aria-hidden className="h-4 w-4" />
                            Añadir categoría
                          </Button>
                          <Button variant="primary" onClick={() => setEditing({ type: 'item', id: null })}>
                            <Plus aria-hidden className="h-4 w-4" />
                            Añadir {itemNoun}
                          </Button>
                        </div>
                      </div>

                      <p role="status" className={filtering ? 'mb-3 mt-0 text-[13.5px] text-[color:var(--color-muted)]' : 'sr-only'}>
                        {filtering ? (rows.length === 1 ? '1 resultado' : `${rows.length} resultados`) : ''}
                      </p>

                      {filtering && rows.length === 0 ? (
                        <EmptyState title="Nada coincide con lo que buscas">Prueba con otro nombre o cambia el filtro «Mostrar».</EmptyState>
                      ) : (
                        <MenuList
                          categories={categories}
                          locales={locales}
                          rows={rows}
                          totals={totals}
                          filtering={filtering}
                          defaultLocale={defaultLocale}
                          itemNoun={itemNoun}
                          onAdd={categoryId => setEditing({ type: 'item', id: null, categoryId })}
                          onEdit={id => setEditing({ type: 'item', id })}
                          onToggle={(id, active) => (kind === 'wines' ? setWineActive : setDishActive).mutate({ id, active })}
                          onRenameCategory={category => setEditing({ type: 'category', category })}
                          onDeleteCategory={setDeleting}
                        />
                      )}
                    </>
                  )}
                </QueryBoundary>

                {editingItem && kind !== 'wines' && (
                  <DishSheet
                    key={editingItem.id ?? 'nuevo'}
                    scope={scope}
                    drink={kind === 'drinks'}
                    categories={(kind === 'drinks' ? drinkCategoriesQuery.data : dishCategoriesQuery.data) ?? []}
                    dish={editingItem.id ? (kind === 'drinks' ? drinks : dishes).find(d => d.id === editingItem.id) ?? null : null}
                    initialCategoryId={editingItem.categoryId}
                    nextOrder={nextItemOrder(editingItem.categoryId ?? categories[0]?.id)}
                    onClose={() => setEditing(null)}
                  />
                )}
                {editingItem && kind === 'wines' && (
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
                    (kind === 'wines' ? deleteWineCategory : deleteDishCategory)
                      .mutateAsync(deleting.id)
                      .then(() => { showSuccessToast('Categoría eliminada'); setDeleting(null); }, () => {});
                  }}
                >
                  <p className="m-0">Está vacía, así que no se pierde {kind === 'drinks' ? 'ninguna' : 'ningún'} {itemNoun}. No se puede deshacer.</p>
                </ConfirmDialog>
              </>
            )}
          </>
        )}
      </QueryBoundary>
    </>
  );
}
