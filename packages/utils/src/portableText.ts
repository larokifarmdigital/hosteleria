import type { I18nPortable } from '@hosteleria/sanity-client';

/** Aplana bloques de Portable Text a párrafos de texto plano. */
export function ptToParagraphs(pt: unknown): string[] {
  if (!Array.isArray(pt)) return [];
  return (pt as { _type?: string; children?: { text?: string }[] }[])
    .filter((b) => b._type === 'block')
    .map((b) => (b.children ?? []).map((c) => c.text ?? '').join(''))
    .filter((s) => s.trim().length > 0);
}

/**
 * Extrae los párrafos de un campo i18n Portable Text, resolviendo el locale
 * y con fallback al defaultLocale.
 */
export function extractI18nParagraphs(field: I18nPortable, loc: string, def: string): string[] {
  if (!field?.length) return [];
  const primary = field.find((x) => x?._key === loc)?.value;
  if (primary?.length) return ptToParagraphs(primary);
  const fallback = field.find((x) => x?._key === def)?.value;
  return ptToParagraphs(fallback);
}
