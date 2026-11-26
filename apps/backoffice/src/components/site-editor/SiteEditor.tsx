'use client';

import { useEffect, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
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
import { SECTION_BY_KEY, editorNav, isEntryActive, restaurantSectionOf, spaceSectionOf, type NavEntry, type SectionKey } from './sections';
import { SpaceSection } from './SpaceSections';

/** Editor de la web de un restaurante: un menú de secciones y la sección abierta. */
export function SiteEditor() {
  const { section, restaurant } = useEditor();
  const meta = SECTION_BY_KEY[section];
  const page = useOpenPage();
  const title = page?.tabs ? page.label : meta.label;
  // La sección cambia sin recargar la página: el título de la pestaña la sigue.
  useEffect(() => {
    document.title = `${title === meta.label ? title : `${title} · ${meta.label}`} · ${restaurant.name} · Hosteleria Studio`;
  }, [title, meta.label, restaurant.name]);
  return (
    <>
      <EditorTopBar />
      <div className="grid grid-cols-1 gap-5 pb-24 sm:pb-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <SectionNav />
        <div className="min-w-0 max-w-[768px]">
          <header className="mb-7">
            <h2 className="m-0 text-[26px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[28px]">{title}</h2>
            {page?.tabs && <PageTabs page={page} />}
            <p className={cn('m-0 max-w-[56ch] border-b border-[color:var(--color-border)] pb-5 text-[14px] leading-[1.5] text-[color:var(--color-muted)]', page?.tabs ? 'mt-4' : 'mt-2')}>{meta.hint}</p>
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

/** Los bloques destacados solo tienen sentido con varios espacios; si ya hay, se enseñan para poder editarlos. */
function useNav() {
  const { section, restaurant, spaces } = useEditor();
  const visible = (key: SectionKey) => key !== 'home' || spaces.length > 1 || restaurant.homeBlocks.length > 0;
  return editorNav(spaces, visible, section);
}

/** La entrada del menú que está abierta. */
function useOpenPage(): NavEntry | undefined {
  const { section, space } = useEditor();
  return useNav().flatMap(g => g.entries).find(entry => isEntryActive(entry, section, space?.id));
}

/** Nº de textos sin traducir y de campos con error de cada sección, para marcarlos en el menú. */
function useSectionMarks() {
  const restaurant = useRestaurantDraft();
  const space = useSpaceDraft();
  const { spaces } = useEditor();
  const sectionOfSpace = (path: string): SectionKey => {
    const key = spaceSectionOf(path);
    return key === 'spacename' && spaces.length < 2 ? 'spaces' : key;
  };
  const pending: Partial<Record<SectionKey, number>> = {};
  const errors: Partial<Record<SectionKey, number>> = {};
  const add = (bag: typeof pending, key: SectionKey, n = 1) => { bag[key] = (bag[key] ?? 0) + n; };
  restaurant.translations.gaps.forEach(gap => add(pending, restaurantSectionOf(gap.field.name)));
  space?.translations.gaps.forEach(gap => add(pending, sectionOfSpace(gap.field.name)));
  const countIn = (errs: FieldErrors, sectionOf: (path: string) => SectionKey) =>
    Object.entries(errs).forEach(([key, node]) => add(errors, sectionOf(key), countErrors({ [key]: node } as FieldErrors)));
  countIn(restaurant.form.formState.errors, restaurantSectionOf);
  if (space) countIn(space.form.formState.errors, sectionOfSpace);
  return { pending, errors };
}

function SectionNav() {
  const { section, goTo, space } = useEditor();
  const { pending, errors } = useSectionMarks();
  const groups = useNav();
  const active = (entry: NavEntry) => isEntryActive(entry, section, space?.id);
  // Los avisos son del espacio abierto: de los demás no se sabe hasta abrirlos.
  const marksOf = (entry: NavEntry) => {
    if (entry.e && entry.e !== space?.id) return {};
    const keys = entry.tabs ?? [entry.key];
    const sum = (bag: Partial<Record<SectionKey, number>>) => keys.reduce((n, key) => n + (bag[key] ?? 0), 0) || undefined;
    return { errors: sum(errors), pending: sum(pending) };
  };
  const note = (entry: NavEntry) => {
    const m = marksOf(entry);
    return m.errors ? ` (${m.errors} por corregir)` : m.pending ? ` (${m.pending} sin traducir)` : '';
  };
  const entries = groups.flatMap(g => g.entries);
  const open = (entry: NavEntry) => goTo(entry.key, entry.e ? { e: entry.e } : {});

  return (
    <div className="lg:sticky lg:top-[136px] lg:max-h-[calc(100dvh-152px)] lg:self-start lg:overflow-y-auto lg:pl-1.5">
      {/* Móvil: un desplegable con todo el menú; las partes de cada página van en pestañas, como en escritorio. */}
      <div className="lg:hidden">
        <label htmlFor="seccion-picker" className="mb-2 block cursor-pointer text-[13px] font-semibold">Sección</label>
        <Select
          id="seccion-picker"
          value={entries.find(active)?.id ?? section}
          onChange={e => { const entry = entries.find(x => x.id === e.target.value); if (entry) open(entry); }}
          className="w-full font-semibold"
        >
          {groups.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.entries.map(entry => <option key={entry.id} value={entry.id}>{entry.label}{note(entry)}</option>)}
            </optgroup>
          ))}
        </Select>
      </div>

      <nav aria-label="Secciones de la web" className="hidden rounded-[12px] border border-[color:var(--color-border)] bg-white px-2 pb-2.5 pt-1 lg:block">
        {groups.map(group => (
          <div key={group.label}>
            <p data-group className="m-0 px-2.5 pb-1.5 pt-3 text-[12px] font-semibold text-[color:var(--color-muted)]">{group.label}</p>
            <ul className="m-0 flex list-none flex-col gap-px p-0">
              {group.entries.map(entry => {
                const isActive = active(entry);
                const marks = marksOf(entry);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => { if (!isActive || !entry.tabs) open(entry); }}
                      className={cn(
                        'relative flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] border-0 px-2.5 py-2 text-left text-[13.5px] transition-colors',
                        isActive
                          ? "bg-[color:var(--color-accent-soft)] font-semibold text-[color:var(--color-ink)] before:absolute before:left-[-5px] before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-[2px] before:bg-[color:var(--color-accent)] before:content-['']"
                          : 'bg-transparent font-medium text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]'
                      )}
                    >
                      {entry.label}
                      <Mark errors={marks.errors} pending={marks.pending} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

/** Las partes de una página de la web (la de inicio o la de un espacio), siempre las mismas. */
function PageTabs({ page }: { page: NavEntry }) {
  const { section, goTo } = useEditor();
  const { pending, errors } = useSectionMarks();
  return (
    <nav aria-label={`Partes de ${page.label}`} className="mt-4 border-b border-[color:var(--color-border)]">
      <ul className="m-0 -mb-px flex list-none flex-wrap gap-x-1 p-0">
        {page.tabs!.map(key => {
          const active = key === section;
          return (
            <li key={key}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => { if (!active) goTo(key, page.e ? { e: page.e } : {}); }}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 border-b-[3px] bg-transparent px-3 text-[14px] transition-colors motion-reduce:transition-none',
                  active
                    ? 'border-[color:var(--color-accent)] font-semibold text-[color:var(--color-ink)]'
                    : 'border-transparent font-medium text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-border)] hover:text-[color:var(--color-ink)]'
                )}
              >
                {SECTION_BY_KEY[key].label}
                <Mark errors={errors[key]} pending={pending[key]} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
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
    case 'spacename':
      return <SpaceSection show="details" />;
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
          {/* Con varios espacios, el nombre de cada uno se cambia en su página. */}
          {space && spaces.length < 2 && <SpaceSection show="details" />}
        </div>
      );
    default:
      return <RestaurantSection show={section} />;
  }
}
