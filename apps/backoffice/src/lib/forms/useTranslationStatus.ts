'use client';

import { useWatch, type Control, type FieldValues } from 'react-hook-form';
import type { PublishBlocker } from '@/components/editor/PublishPanel';
import { gapsByLocale, localeList, translationGaps, type TranslatableField } from './translations';

interface Options<T extends FieldValues> {
  control: Control<T>;
  fields: TranslatableField[];
  locales: string[];
  localeNames: Record<string, string>;
  /** Enseña el idioma y pone el foco en el campo. */
  onGo: (fieldName: string, locale: string) => void;
}

/** Traducciones que faltan en lo que hay escrito ahora mismo en el formulario. */
export function useTranslationStatus<T extends FieldValues>({ control, fields, locales, localeNames, onGo }: Options<T>) {
  const values = useWatch({ control });
  const gaps = translationGaps(fields, values, locales);

  const blockers: PublishBlocker[] = gaps.map(gap => ({
    id: gap.field.name,
    label: `${gap.field.section} · ${gap.field.label}`,
    missing: localeList(gap.locales, localeNames),
    onGo: () => onGo(gap.field.name, gap.locales[0])
  }));

  return {
    /** Campos con traducción pendiente y los idiomas que les faltan. */
    gaps,
    blockers,
    /** Nº de textos que faltan en cada idioma. */
    byLocale: gapsByLocale(gaps),
    /** Nº de campos con traducción pendiente en una sección. */
    inSection: (section: string) => gaps.filter(gap => gap.field.section === section).length
  };
}
