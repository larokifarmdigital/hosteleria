import { i18nMissingLocales, type I18nValue } from './i18n.js';
import type { Dish, DishCategory } from './dish.js';
import type { Wine, WineCategory } from './wine.js';
import type { LegalPage, LegalPageType } from './legalPage.js';
import type { MediaAsset } from './media.js';
import { restaurantMediaUses, restaurantTranslatableTexts, type Restaurant } from './restaurant.js';
import { spaceMediaIds, spaceTranslatableTexts, type Space } from './space.js';

/**
 * Lo que le falta al contenido de un restaurante para estar completo, calculado
 * sobre lo que el editor tiene guardado (el borrador), que es lo que puede arreglar.
 */

/** Parte de la ficha del restaurante donde está el texto. */
export type RestaurantArea = 'content' | 'uiTexts' | 'search';

export type TaskTarget =
  | { kind: 'restaurant'; area?: RestaurantArea }
  | { kind: 'space'; spaceId: string; spaceName: string }
  | { kind: 'menu'; menu: 'dishes' | 'drinks' | 'wines'; spaceId: string; spaceName: string }
  | { kind: 'legal'; legalType: LegalPageType }
  | { kind: 'media' };

export type PendingTask =
  /** Textos que están en unos idiomas activos y en otros no. */
  | { type: 'translations'; target: TaskTarget; count: number; locales: string[]; examples: string[] }
  /** Fotos en uso sin descripción en algún idioma activo. */
  | { type: 'image_descriptions'; target: { kind: 'media' }; count: number; locales: string[] }
  /** Espacio sin ningún turno: la web lo enseña como cerrado toda la semana. */
  | { type: 'no_schedule'; target: { kind: 'space'; spaceId: string; spaceName: string } }
  /** Nunca publicado, o con cambios guardados que la web aún no enseña. */
  | { type: 'unpublished'; target: { kind: 'restaurant' } | { kind: 'space'; spaceId: string; spaceName: string }; neverPublished: boolean };

export interface PendingTaskSources {
  restaurant: Restaurant;
  spaces: Space[];
  dishCategories: DishCategory[];
  dishes: Dish[];
  wineCategories: WineCategory[];
  wines: Wine[];
  legalPages: LegalPage[];
  /** Las imágenes del restaurante. */
  media: MediaAsset[];
}

function areaOf(label: string): RestaurantArea {
  if (label.startsWith('Textos de la web:')) return 'uiTexts';
  if (label.endsWith('en Google') || label.startsWith('Resumen para asistentes')) return 'search';
  return 'content';
}

interface Gap { label: string; locales: string[] }

function gapsOf(texts: Record<string, I18nValue | null | undefined>, locales: string[]): Gap[] {
  return Object.entries(texts)
    .map(([label, value]) => ({ label, locales: i18nMissingLocales(value, locales) }))
    .filter(g => g.locales.length > 0);
}

function translationTask(target: TaskTarget, gaps: Gap[], activeLocales: string[]): PendingTask[] {
  if (gaps.length === 0) return [];
  const missing = new Set(gaps.flatMap(g => g.locales));
  return [{
    type: 'translations',
    target,
    count: gaps.length,
    locales: activeLocales.filter(code => missing.has(code)),
    examples: gaps.slice(0, 3).map(g => g.label)
  }];
}

export function buildPendingTasks(src: PendingTaskSources): PendingTask[] {
  const r = src.restaurant;
  const locales = r.activeLocaleCodes;
  const tasks: PendingTask[] = [];
  const spaces = [...src.spaces].sort((a, b) => a.order - b.order);

  // 1. Publicación: lo primero, porque decide si la web enseña algo.
  const neverPublished = !r.publishedSnapshot;
  if (neverPublished || r.state !== 'published') tasks.push({ type: 'unpublished', target: { kind: 'restaurant' }, neverPublished });
  for (const s of spaces) {
    if (!s.publishedSnapshot || s.state !== 'published') {
      tasks.push({ type: 'unpublished', target: { kind: 'space', spaceId: s.id, spaceName: s.name }, neverPublished: !s.publishedSnapshot });
    }
  }

  // 2. Horarios.
  for (const s of spaces) {
    if (!s.schedule.some(d => d.shifts.length > 0)) {
      tasks.push({ type: 'no_schedule', target: { kind: 'space', spaceId: s.id, spaceName: s.name } });
    }
  }

  // 3. Traducciones: con un solo idioma no hay nada que traducir.
  if (locales.length > 1) {
    const restaurantGaps = gapsOf(restaurantTranslatableTexts(r), locales);
    for (const area of ['content', 'uiTexts', 'search'] as const) {
      tasks.push(...translationTask({ kind: 'restaurant', area }, restaurantGaps.filter(g => areaOf(g.label) === area), locales));
    }

    for (const s of spaces) {
      const at = { spaceId: s.id, spaceName: s.name };
      tasks.push(...translationTask({ kind: 'space', ...at }, gapsOf(spaceTranslatableTexts(s), locales), locales));

      for (const menu of ['dishes', 'drinks'] as const) {
        const categories = src.dishCategories.filter(c => c.spaceId === s.id && c.kind === (menu === 'drinks' ? 'drink' : 'dish'));
        const ids = new Set(categories.map(c => c.id));
        const gaps: Gap[] = [];
        for (const c of categories) {
          const missing = i18nMissingLocales(c.name, locales);
          if (missing.length > 0) gaps.push({ label: `Categoría «${nameOf(c.name, r.defaultLocaleCode)}»`, locales: missing });
        }
        for (const d of src.dishes.filter(d => ids.has(d.categoryId))) {
          const missing = [...new Set([...i18nMissingLocales(d.name, locales), ...i18nMissingLocales(d.note, locales)])];
          if (missing.length > 0) gaps.push({ label: nameOf(d.name, r.defaultLocaleCode), locales: missing });
        }
        tasks.push(...translationTask({ kind: 'menu', menu, ...at }, gaps, locales));
      }

      const wineGaps: Gap[] = [];
      for (const c of src.wineCategories.filter(c => c.spaceId === s.id)) {
        const missing = i18nMissingLocales(c.name, locales);
        if (missing.length > 0) wineGaps.push({ label: `Categoría «${nameOf(c.name, r.defaultLocaleCode)}»`, locales: missing });
      }
      // El nombre de un vino no se traduce; su nota, sí.
      for (const w of src.wines.filter(w => w.spaceId === s.id)) {
        const missing = i18nMissingLocales(w.note, locales);
        if (missing.length > 0) wineGaps.push({ label: w.name, locales: missing });
      }
      tasks.push(...translationTask({ kind: 'menu', menu: 'wines', ...at }, wineGaps, locales));
    }

    for (const p of src.legalPages) {
      const gaps = gapsOf({ Título: p.title, Contenido: p.content }, locales);
      tasks.push(...translationTask({ kind: 'legal', legalType: p.type }, gaps, locales));
    }
  }

  // 4. Fotos en uso sin descripción: sin ella, quien no ve la foto no sabe qué hay.
  const used = new Set<string>([
    ...restaurantMediaUses(r).map(u => u.assetId),
    ...spaces.flatMap(s => spaceMediaIds(s)),
    ...src.dishes.map(d => d.imageAssetId).filter((id): id is string => !!id)
  ]);
  const missingAlt = new Set<string>();
  let images = 0;
  for (const m of src.media) {
    if (!used.has(m.id) || !m.confirmedAt) continue;
    const missing = locales.filter(code => !m.altText?.[code]?.trim());
    if (missing.length === 0) continue;
    images++;
    missing.forEach(code => missingAlt.add(code));
  }
  if (images > 0) {
    tasks.push({ type: 'image_descriptions', target: { kind: 'media' }, count: images, locales: locales.filter(code => missingAlt.has(code)) });
  }

  return tasks;
}

function nameOf(name: I18nValue | undefined, defaultLocale: string): string {
  return name?.[defaultLocale] ?? Object.values(name ?? {}).find(Boolean) ?? 'Sin nombre';
}
