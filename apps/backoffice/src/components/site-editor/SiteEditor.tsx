'use client';

import { useEffect, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { ChevronRight } from 'lucide-react';
import { SpacesSection } from '@/components/restaurant/SpacesSection';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { EditorSectionTitleProvider, SectionHeadingLevel } from '@/components/shared/Section';
import { Select } from '@/components/ui/inputs';
import { countErrors } from '@/lib/forms/errors';
import { cn } from '@/lib/utils';
import { DishesPageClient } from '@/app/(app)/dishes/DishesPageClient';
import { MediaPageClient } from '@/app/(app)/media/MediaPageClient';
import { useEditor, useRestaurantDraft, useSpaceDraft } from './EditorContext';
import { EditorMobileBar, EditorTopBar } from './EditorTopBar';
import { LegalSection } from './LegalSection';
import { RestaurantSection, UiTextsFold } from './RestaurantSections';
import { BOOKING_TEXTS, FOOTER_TEXTS, GALLERY_TITLES, MENU_TITLES } from '@/app/(app)/restaurants/[slug]/form/model';
import { SECTION_BY_KEY, navGroups, restaurantSectionOf, spaceSectionOf, type NavItem, type SectionKey } from './sections';
import { SpaceSection } from './SpaceSections';

/** Editor de la web de un restaurante: un menú de secciones y la sección abierta. */
export function SiteEditor() {
  const { section, spaces, space } = useEditor();
  const meta = SECTION_BY_KEY[section];
  // Con varios espacios, el menú ya dice de qué espacio es cada sección; aquí se recuerda encima del título.
  const spaceName = meta.perSpace && spaces.length > 1 ? space?.name : undefined;
  const { restaurant } = useEditor();
  // La sección cambia sin recargar la página: el título de la pestaña la sigue.
  useEffect(() => { document.title = `${meta.label} · ${restaurant.name} · Hosteleria Studio`; }, [meta.label, restaurant.name]);
  return (
    <>
      <EditorTopBar />
      <div className="grid grid-cols-1 gap-5 pb-24 sm:pb-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <SectionNav />
        <div className="min-w-0 max-w-[768px]">
          <header className="mb-7 border-b border-[color:var(--color-border)] pb-5">
            {spaceName && <p className="m-0 mb-1.5 text-[13px] font-semibold text-[color:var(--color-accent)]">{spaceName}</p>}
            <h2 className="m-0 text-[26px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[28px]">{meta.label}</h2>
            <p className="m-0 mt-2 max-w-[56ch] text-[14px] leading-[1.5] text-[color:var(--color-muted)]">{meta.hint}</p>
          </header>
          {/* La sección ya tiene su h2: los bloques de dentro van un nivel por debajo y no repiten su nombre. */}
          <SectionHeadingLevel value={3}>
            <EditorSectionTitleProvider value={meta.label}>
              <SectionContent section={section} />
            </EditorSectionTitleProvider>
          </SectionHeadingLevel>
        </div>
      </div>
      <EditorMobileBar />
    </>
  );
}

/** Nº de textos sin traducir y de campos con error de cada sección, para marcarlos en el menú. */
function useSectionMarks() {
  const restaurant = useRestaurantDraft();
  const space = useSpaceDraft();
  const pending: Partial<Record<SectionKey, number>> = {};
  const errors: Partial<Record<SectionKey, number>> = {};
  const add = (bag: typeof pending, key: SectionKey, n = 1) => { bag[key] = (bag[key] ?? 0) + n; };
  restaurant.translations.gaps.forEach(gap => add(pending, restaurantSectionOf(gap.field.name)));
  space?.translations.gaps.forEach(gap => add(pending, spaceSectionOf(gap.field.name)));
  const countIn = (errs: FieldErrors, sectionOf: (path: string) => SectionKey) =>
    Object.entries(errs).forEach(([key, node]) => add(errors, sectionOf(key), countErrors({ [key]: node } as FieldErrors)));
  countIn(restaurant.form.formState.errors, restaurantSectionOf);
  if (space) countIn(space.form.formState.errors, spaceSectionOf);
  return { pending, errors };
}

function SectionNav() {
  const { section, goTo, restaurant, spaces, space } = useEditor();
  const { pending, errors } = useSectionMarks();
  // Los bloques destacados solo tienen sentido con varios espacios; si ya hay, se enseñan para poder editarlos.
  const visible = (key: SectionKey) => key !== 'home' || spaces.length > 1 || restaurant.homeBlocks.length > 0;
  const groups = navGroups(spaces, visible);
  const [foldOpen, setFoldOpen] = useState(false);
  const isActive = (item: NavItem) => item.key === section && (!item.e || item.e === space?.id);
  // Los avisos son del espacio abierto: de los demás no se sabe hasta abrirlos.
  const marksOf = (item: NavItem) => (!item.e || item.e === space?.id ? { errors: errors[item.key], pending: pending[item.key] } : {});
  const note = (item: NavItem) => {
    const m = marksOf(item);
    return m.errors ? ` (${m.errors} por corregir)` : m.pending ? ` (${m.pending} sin traducir)` : '';
  };
  const valueOf = (item: NavItem) => `${item.key}:${item.e ?? ''}`;
  const open = (item: NavItem) => goTo(item.key, item.e ? { e: item.e } : {});

  return (
    <div className="lg:sticky lg:top-[136px] lg:max-h-[calc(100dvh-152px)] lg:self-start lg:overflow-y-auto lg:pl-1.5">
      {/* Móvil: un desplegable con todas las secciones. */}
      <div className="lg:hidden">
        <label htmlFor="seccion-picker" className="mb-2 block cursor-pointer text-[13px] font-semibold">Sección</label>
        <Select
          id="seccion-picker"
          value={valueOf(groups.flatMap(g => g.items).find(isActive) ?? { key: section })}
          onChange={e => {
            const [key, id] = e.target.value.split(':');
            open({ key: key as SectionKey, e: id || undefined });
          }}
          className="w-full font-semibold"
        >
          {groups.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map(item => (
                <option key={valueOf(item)} value={valueOf(item)}>{SECTION_BY_KEY[item.key].label}{note(item)}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <nav aria-label="Secciones de la web" className="hidden rounded-[12px] border border-[color:var(--color-border)] bg-white px-2 pb-2.5 pt-1 lg:block">
        {groups.map(group => {
          const hasActive = group.items.some(isActive);
          const marked = group.items.some(item => { const m = marksOf(item); return m.errors || m.pending; });
          const expanded = !group.folded || foldOpen || hasActive;
          return (
            <div key={group.label}>
              {group.folded ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  // Con la sección abierta dentro, el grupo no se puede plegar: se perdería de vista dónde se está.
                  disabled={hasActive}
                  onClick={() => setFoldOpen(v => !v)}
                  className="mt-2 flex min-h-9 w-full cursor-pointer items-center gap-1.5 rounded-[8px] border-0 border-t border-solid border-[color:var(--color-border)] bg-transparent px-2.5 pt-2 text-left text-[12px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] disabled:cursor-default disabled:hover:text-[color:var(--color-muted)]"
                >
                  <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform motion-reduce:transition-none', expanded && 'rotate-90')} />
                  <span data-group className="flex-1">{group.label}</span>
                  {!expanded && marked && <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[color:var(--color-warn)]" />}
                  {!expanded && marked && <span className="sr-only">, hay avisos dentro</span>}
                </button>
              ) : (
                <p data-group className="m-0 px-2.5 pb-1.5 pt-3 text-[12px] font-semibold text-[color:var(--color-muted)]">{group.label}</p>
              )}
              {expanded && (
                <ul className="m-0 flex list-none flex-col gap-px p-0">
                  {group.items.map(item => {
                    const active = isActive(item);
                    const marks = marksOf(item);
                    return (
                      <li key={valueOf(item)}>
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          // Con varios espacios, cada «Portada» dice de cuál es.
                          aria-label={item.e ? `${SECTION_BY_KEY[item.key].label}, ${group.label}${note(item)}` : undefined}
                          onClick={() => open(item)}
                          className={cn(
                            'relative flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] border-0 px-2.5 py-2 text-left text-[13.5px] transition-colors',
                            active
                              ? "bg-[color:var(--color-accent-soft)] font-semibold text-[color:var(--color-ink)] before:absolute before:left-[-5px] before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-[2px] before:bg-[color:var(--color-accent)] before:content-['']"
                              : 'bg-transparent font-medium text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]'
                          )}
                        >
                          {SECTION_BY_KEY[item.key].label}
                          <Mark errors={marks.errors} pending={marks.pending} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function Mark({ errors, pending }: { errors?: number; pending?: number }) {
  if (errors) {
    return (
      <span className="tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-danger-soft)] px-1 text-[11px] font-bold text-[color:var(--color-danger)]">
        <span aria-hidden>{errors}</span>
        <span className="sr-only">{errors === 1 ? ', 1 campo por corregir' : `, ${errors} campos por corregir`}</span>
      </span>
    );
  }
  if (pending) {
    // Un punto basta: cuántos textos faltan lo dicen las pestañas de idioma de la sección.
    return (
      <span className="inline-flex flex-shrink-0 items-center">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[color:var(--color-warn)]" />
        <span className="sr-only">{pending === 1 ? ', falta traducir 1 texto' : `, falta traducir ${pending} textos`}</span>
      </span>
    );
  }
  return null;
}

/** En «Espacios», con varios, para elegir de cuál se cambia el nombre. */
function SpacePicker() {
  const { spaces, space, section, goTo } = useEditor();
  if (spaces.length < 2 || !space) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <label htmlFor="espacio-picker" className="cursor-pointer text-[13.5px] font-medium text-[color:var(--color-ink-soft)]">Espacio</label>
      <Select id="espacio-picker" value={space.id} onChange={e => goTo(section, { e: e.target.value })} className="min-w-[200px] flex-1 sm:max-w-[320px]">
        {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </div>
  );
}

function SectionContent({ section }: { section: SectionKey }) {
  const { restaurant, spaces, space, goTo } = useEditor();
  const needsSpace = SECTION_BY_KEY[section].perSpace;

  if (needsSpace && !space) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState title="Aún no hay ningún espacio">La portada, el horario, las fotos y la carta van por espacio: comedor, terraza, barra… Añade el primero.</EmptyState>
        <Button variant="primary" onClick={() => goTo('spaces')}>Ir a Espacios</Button>
      </div>
    );
  }

  switch (section) {
    case 'cover': case 'hours':
      return <SpaceSection show={section} />;
    case 'photos':
      return (
        <div className="flex flex-col gap-8">
          <SpaceSection show="photos" />
          <UiTextsFold title={GALLERY_TITLES} summary="Opcional. Lo que se lee encima de las fotos en la web." />
        </div>
      );
    case 'contact':
      return (
        <div className="flex flex-col gap-8">
          <RestaurantSection show="contact" />
          <div className="flex flex-col gap-3">
            <UiTextsFold title={BOOKING_TEXTS} summary="Opcional. El título y la frase que acompañan al formulario de reserva." />
            <UiTextsFold title={FOOTER_TEXTS} summary="Opcional. La frase que va bajo el nombre, al final de la página." />
          </div>
          <RestaurantSection show="admin" />
        </div>
      );
    case 'menu':
      return (
        <div className="flex flex-col gap-8">
          <DishesPageClient key={space!.id} slug={restaurant.slug} spaceId={space!.id} embedded />
          <UiTextsFold title={MENU_TITLES} summary="Opcional. Lo que se lee encima de la carta y de los vinos. Sale en la web al publicar." />
        </div>
      );
    case 'media':
      return <MediaPageClient slug={restaurant.slug} embedded />;
    case 'legal':
      return <LegalSection />;
    case 'spaces':
      return (
        <div className="flex flex-col gap-8">
          <SpacesSection restaurant={restaurant} spaces={spaces} />
          {space && (
            <div>
              <SpacePicker />
              <SpaceSection show="details" />
            </div>
          )}
        </div>
      );
    default:
      return <RestaurantSection show={section} />;
  }
}
