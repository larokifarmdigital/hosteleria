'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormProvider, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type { Restaurant, Space } from '@hosteleria/api-client';
import { useTranslationStatus } from '@/lib/forms/useTranslationStatus';
import { useUnsavedChangesWarning } from '@/lib/forms/useUnsavedChangesWarning';
import { qk } from '@/lib/query/keys';
import { usePatchRestaurant, usePatchSpace } from '@/lib/query/hooks';
import * as restaurantForm from '@/app/(app)/restaurants/[slug]/form/model';
import * as spaceForm from './spaceForm';
import { restaurantSectionOf, sectionFromParam, sectionHref, spaceSectionOf, type SectionKey } from './sections';
import { useAutosave, type SaveStatus } from './useAutosave';

type TranslationStatus = ReturnType<typeof useTranslationStatus>;

export interface Draft<T extends Record<string, unknown>> {
  form: UseFormReturn<T>;
  status: SaveStatus;
  flush: () => Promise<void>;
  translations: TranslationStatus;
}

interface Nav {
  restaurant: Restaurant;
  spaces: Space[];
  /** El espacio que se edita en las secciones de espacio. */
  space: Space | null;
  localeNames: Record<string, string>;
  locales: string[];
  defaultLocale: string;
  isAdmin: boolean;
  /** Idioma que se está escribiendo; es el mismo en todas las secciones. */
  locale: string;
  setLocale: (code: string) => void;
  section: SectionKey;
  /** Abre una sección (y, si se indica, un espacio o una página legal). */
  goTo: (section: SectionKey, extra?: { e?: string; p?: string | null }) => void;
  /** Página legal abierta dentro de «Textos legales». */
  legalPage: string | null;
}

const NavContext = createContext<Nav | null>(null);
const RestaurantDraftContext = createContext<Draft<restaurantForm.FormValues> | null>(null);
const SpaceDraftContext = createContext<Draft<spaceForm.SpaceFormValues> | null>(null);

export const useEditor = () => {
  const value = useContext(NavContext);
  if (!value) throw new Error('useEditor fuera del editor');
  return value;
};
export const useRestaurantDraft = () => {
  const value = useContext(RestaurantDraftContext);
  if (!value) throw new Error('useRestaurantDraft fuera del editor');
  return value;
};
/** null si el restaurante aún no tiene espacios. */
export const useSpaceDraft = () => useContext(SpaceDraftContext);

interface ProviderProps {
  restaurant: Restaurant;
  spaces: Space[];
  localeNames: Record<string, string>;
  isAdmin: boolean;
  children: React.ReactNode;
}

/** Navegación del editor: la sección, el espacio y la página legal van en la URL. */
export function EditorProvider({ restaurant, spaces, localeNames, isAdmin, children }: ProviderProps) {
  const params = useSearchParams();
  const ordered = useMemo(() => [...spaces].sort((a, b) => a.order - b.order), [spaces]);
  const section: SectionKey = sectionFromParam(params.get('s') ?? params.get('tab'));
  const space = ordered.find(s => s.id === params.get('e')) ?? ordered.find(s => s.isDefault) ?? ordered[0] ?? null;
  const locales = restaurant.activeLocales as string[];
  const defaultLocale = restaurant.defaultLocale as string;
  const [chosenLocale, setLocale] = useState(defaultLocale);
  // Si se quita el idioma que se estaba viendo, se vuelve al principal.
  const locale = locales.includes(chosenLocale) ? chosenLocale : defaultLocale;

  const goTo = useCallback((next: SectionKey, extra: { e?: string; p?: string | null } = {}) => {
    const current = new URLSearchParams(window.location.search);
    const e = extra.e ?? current.get('e') ?? undefined;
    const p = extra.p === undefined ? (next === 'legal' ? current.get('p') ?? undefined : undefined) : extra.p ?? undefined;
    const href = sectionHref(restaurant.slug, next, { e, p });
    if (href !== window.location.pathname + window.location.search) window.history.pushState(null, '', href);
    window.scrollTo({ top: 0 });
  }, [restaurant.slug]);

  const value: Nav = {
    restaurant, spaces: ordered, space, localeNames, locales, defaultLocale, isAdmin,
    locale, setLocale, section, goTo, legalPage: params.get('p')
  };

  return (
    <NavContext.Provider value={value}>
      {/* Otros idiomas = otros campos: los borradores se montan de nuevo. */}
      <RestaurantDraftHost key={`${locales.join(',')}:${defaultLocale}`}>
        {space ? <SpaceDraftHost key={`${space.id}:${locales.join(',')}`} space={space}>{children}</SpaceDraftHost> : children}
      </RestaurantDraftHost>
    </NavContext.Provider>
  );
}

/** Pone el foco en un campo cuando su sección ya está en pantalla. */
/** Aviso de que se quiere ir a un campo: las listas lo escuchan para abrir el elemento que lo contiene. */
export const FOCUS_FIELD_EVENT = 'editor:focus-field';

function focusLater<T extends Record<string, unknown>>(form: UseFormReturn<T>, path: string) {
  // El campo puede estar plegado o dentro de un elemento de lista que se edita en un diálogo.
  const reveal = () => document.getElementsByName(path)[0]?.closest('details')?.setAttribute('open', '');
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(FOCUS_FIELD_EVENT, { detail: path }));
    reveal();
    setTimeout(() => {
      reveal();
      try { form.setFocus(path as Parameters<typeof form.setFocus>[0]); } catch { /* el campo no está en pantalla */ }
    }, 160);
  }, 60);
}

function RestaurantDraftHost({ children }: { children: React.ReactNode }) {
  const { restaurant, locales, localeNames, goTo, setLocale } = useEditor();
  const qc = useQueryClient();
  const form = useForm<restaurantForm.FormValues>({
    resolver: zodResolver(restaurantForm.schema),
    defaultValues: restaurantForm.toForm(restaurant),
    shouldFocusError: false
  });
  const patch = usePatchRestaurant(restaurant.slug);
  // Siempre la ficha más reciente: lo que el formulario no edita se conserva tal cual.
  const current = useRef(restaurant);
  current.current = restaurant;

  const autosave = useAutosave({
    form,
    save: async values => {
      await patch.mutateAsync(restaurantForm.toPatch(values, current.current));
      void qc.invalidateQueries({ queryKey: qk.pendingTasks.all });
    }
  });

  const values = useWatch({ control: form.control });
  const translations = useTranslationStatus({
    control: form.control,
    fields: restaurantForm.translatableFields(values as Partial<restaurantForm.FormValues>, restaurant),
    locales,
    localeNames,
    onGo: (name, code) => {
      goTo(restaurantSectionOf(name));
      setLocale(code);
      focusLater(form, `${name}.${code}`);
    }
  });

  useUnsavedChangesWarning(form.formState.isDirty || autosave.status.state === 'saving');

  const draft: Draft<restaurantForm.FormValues> = { form, status: autosave.status, flush: autosave.flush, translations };
  return (
    <RestaurantDraftContext.Provider value={draft}>
      <FormProvider {...form}>{children}</FormProvider>
    </RestaurantDraftContext.Provider>
  );
}

function SpaceDraftHost({ space, children }: { space: Space; children: React.ReactNode }) {
  const { restaurant, locales, localeNames, goTo, setLocale } = useEditor();
  const qc = useQueryClient();
  const form = useForm<spaceForm.SpaceFormValues>({
    resolver: zodResolver(spaceForm.schema),
    defaultValues: spaceForm.toForm(space, locales),
    shouldFocusError: false
  });
  const patch = usePatchSpace(restaurant.slug, space.id);
  const current = useRef(space);
  current.current = space;

  const autosave = useAutosave({
    form,
    // Una portada con foto no se guarda sin su descripción en todos los idiomas.
    check: values => {
      if (!values.hero.imageAssetId) return null;
      const missing = locales.find(code => !values.hero.imageAlt[code]?.trim());
      return missing ? { path: `hero.imageAlt.${missing}`, message: `Describe la foto en ${localeNames[missing] ?? missing.toUpperCase()}.` } : null;
    },
    save: async values => {
      await patch.mutateAsync(spaceForm.toPatch(values, current.current));
      void qc.invalidateQueries({ queryKey: qk.pendingTasks.all });
    }
  });

  const heroImageId = useWatch({ control: form.control, name: 'hero.imageAssetId' });
  const translations = useTranslationStatus({
    control: form.control,
    // La descripción de la foto solo cuenta si hay foto.
    fields: heroImageId ? [...spaceForm.TRANSLATABLE, spaceForm.IMAGE_ALT] : spaceForm.TRANSLATABLE,
    locales,
    localeNames,
    onGo: (name, code) => {
      goTo(spaceSectionOf(name), { e: space.id });
      setLocale(code);
      focusLater(form, `${name}.${code}`);
    }
  });

  useUnsavedChangesWarning(form.formState.isDirty || autosave.status.state === 'saving');

  // Antes de cambiar de espacio se guarda lo pendiente del que se deja.
  const flush = autosave.flush;
  useEffect(() => () => { void flush(); }, [flush]);

  const draft: Draft<spaceForm.SpaceFormValues> = { form, status: autosave.status, flush: autosave.flush, translations };
  return <SpaceDraftContext.Provider value={draft}>{children}</SpaceDraftContext.Provider>;
}

/** Guarda ya todo lo pendiente de los dos borradores. */
export function useFlushAll() {
  const restaurant = useRestaurantDraft();
  const space = useSpaceDraft();
  return useCallback(async () => {
    await Promise.all([restaurant.flush(), space?.flush()]);
  }, [restaurant, space]);
}

/** Lleva al campo con error de un borrador. */
export function useGoToField() {
  const { goTo, space, setLocale } = useEditor();
  const restaurant = useRestaurantDraft();
  const spaceDraft = useSpaceDraft();
  return (which: 'restaurant' | 'space', path: string) => {
    const locale = path.split('.').find(part => /^[a-z]{2}$/.test(part));
    if (locale) setLocale(locale);
    if (which === 'restaurant') {
      goTo(restaurantSectionOf(path));
      focusLater(restaurant.form, path);
    } else if (spaceDraft && space) {
      goTo(spaceSectionOf(path), { e: space.id });
      focusLater(spaceDraft.form, path);
    }
  };
}
