import { z } from 'zod';
import type { ApiClient, Space } from '@hosteleria/api-client';
import { i18nFromForm, i18nToForm, sameContent } from '@/lib/forms/i18n';
import { i18nValues, optionalText, requiredText } from '@/lib/forms/rules';
import { scheduleForCompare, scheduleSchema } from '@/lib/forms/schedule';
import type { TranslatableField } from '@/lib/forms/translations';

// Formulario de un espacio: lo que se valida, cómo se pasa del api al formulario y vuelta.

const HERO_FIELDS = ['title', 'subtitle', 'note', 'metaLeft', 'metaRight', 'cta', 'imageAlt'] as const;
const MANIFESTO_FIELDS = ['eyebrow', 'text'] as const;
const SCHEDULE_TEXT_FIELDS = ['title', 'text', 'open', 'nextOpening', 'closed'] as const;

export const COVER = 'Portada';
export const INTRO = 'Texto de presentación';
export const SCHEDULE_TEXTS = 'Textos del horario';
export const TRANSLATABLE: TranslatableField[] = [
  { name: 'hero.title', label: 'Título', section: COVER },
  { name: 'hero.subtitle', label: 'Subtítulo', section: COVER },
  { name: 'hero.note', label: 'Texto breve', section: COVER },
  { name: 'hero.metaLeft', label: 'Dato a la izquierda', section: COVER },
  { name: 'hero.metaRight', label: 'Dato a la derecha', section: COVER },
  { name: 'hero.cta', label: 'Texto del botón', section: COVER },
  { name: 'manifesto.eyebrow', label: 'Antetítulo', section: INTRO },
  { name: 'manifesto.text', label: 'Texto', section: INTRO },
  { name: 'scheduleTexts.title', label: 'Título', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.text', label: 'Texto', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.open', label: 'Aviso de abierto', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.nextOpening', label: 'Aviso de próxima apertura', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.closed', label: 'Aviso de cerrado', section: SCHEDULE_TEXTS }
];
export const IMAGE_ALT: TranslatableField = { name: 'hero.imageAlt', label: 'Descripción de la foto', section: COVER };

export const schema = z.object({
  name: requiredText(120),
  descriptor: optionalText(200),
  hero: z.object({
    title: i18nValues,
    subtitle: i18nValues,
    note: i18nValues,
    metaLeft: i18nValues,
    metaRight: i18nValues,
    cta: i18nValues,
    imageAlt: i18nValues,
    /** Vacío = sin foto. */
    imageAssetId: z.string()
  }),
  manifesto: z.object({ eyebrow: i18nValues, text: i18nValues }),
  gallery: z.array(z.string()),
  scheduleTexts: z.object({ title: i18nValues, text: i18nValues, open: i18nValues, nextOpening: i18nValues, closed: i18nValues }),
  // La dirección, el mapa y el contacto son los del restaurante: ninguna web lee los de un espacio.
  schedule: scheduleSchema
});

export type SpaceFormValues = z.infer<typeof schema>;

export function toForm(space: Space, locales: string[]): SpaceFormValues {
  return {
    name: space.name,
    descriptor: space.descriptor ?? '',
    hero: {
      ...Object.fromEntries(HERO_FIELDS.map(f => [f, i18nToForm(space.hero[f], locales)])),
      imageAssetId: space.hero.imageAssetId ?? ''
    } as SpaceFormValues['hero'],
    manifesto: Object.fromEntries(MANIFESTO_FIELDS.map(f => [f, i18nToForm(space.manifesto[f], locales)])) as SpaceFormValues['manifesto'],
    gallery: space.gallery,
    scheduleTexts: Object.fromEntries(SCHEDULE_TEXT_FIELDS.map(f => [f, i18nToForm(space.scheduleTexts[f], locales)])) as SpaceFormValues['scheduleTexts'],
    schedule: space.schedule.map(d => ({ day: d.day, shifts: d.shifts.map(s => ({ open: s.open, close: s.close })) }))
  };
}

export function changedBlocks(space: Space): string[] {
  const snap = space.publishedSnapshot;
  if (!snap) return [];
  const blocks: [string, unknown, unknown][] = [
    ['Descripción corta', space.descriptor, snap.descriptor],
    ['Portada', space.hero, snap.hero],
    ['Texto de presentación', space.manifesto, snap.manifesto]
  ];
  // Las versiones publicadas antes de que el api guardara nombre y horarios no
  // los traen: sin referencia no se puede decir que hayan cambiado.
  if (snap.name !== undefined) blocks.unshift(['Nombre', space.name, snap.name]);
  if (snap.gallery !== undefined) blocks.push(['Galería', space.gallery, snap.gallery]);
  if (snap.schedule !== undefined) blocks.push(['Horarios', scheduleForCompare(space.schedule), scheduleForCompare(snap.schedule)]);
  if (snap.scheduleTexts !== undefined) blocks.push([SCHEDULE_TEXTS, space.scheduleTexts, snap.scheduleTexts]);
  return blocks.filter(([, now, before]) => !sameContent(now, before)).map(([label]) => label);
}


export type SpacePatch = Parameters<ApiClient['spaces']['patch']>[2];

/** Lo que se envía al api. */
export function toPatch(values: SpaceFormValues, space: Space): SpacePatch {
  // `hero` se envía entero: la foto anterior se quita aquí y solo vuelve si sigue elegida.
  const { imageAssetId: _previousImage, ...heroBase } = space.hero;
  return {
    name: values.name,
    descriptor: values.descriptor,
    // El api sustituye `hero` y `manifesto` enteros: se parte del valor actual
    // para conservar lo que este formulario no edita.
    hero: {
      ...heroBase,
      ...Object.fromEntries(HERO_FIELDS.map(f => [f, i18nFromForm(space.hero[f], values.hero[f])])),
      ...(values.hero.imageAssetId ? { imageAssetId: values.hero.imageAssetId } : {})
    },
    manifesto: {
      ...space.manifesto,
      ...Object.fromEntries(MANIFESTO_FIELDS.map(f => [f, i18nFromForm(space.manifesto[f], values.manifesto[f])]))
    },
    gallery: values.gallery,
    scheduleTexts: {
      ...space.scheduleTexts,
      ...Object.fromEntries(SCHEDULE_TEXT_FIELDS.map(f => [f, i18nFromForm(space.scheduleTexts[f], values.scheduleTexts[f])]))
    },
    schedule: values.schedule,
    // Guardar nunca publica: deja el contenido como borrador hasta que se pulse Publicar.
    state: 'draft'
  };
}
