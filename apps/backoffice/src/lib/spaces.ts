import type { SpaceType } from '@hosteleria/api-client';

export const SPACE_TYPES: { value: SpaceType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'cafe', label: 'Café' },
  { value: 'coctel', label: 'Coctelería' },
  { value: 'club', label: 'Club' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'live_music', label: 'Música en directo' },
  { value: 'otro', label: 'Otro' }
];

export const spaceTypeLabel = (type: string) => SPACE_TYPES.find(t => t.value === type)?.label ?? 'Otro';

/** «Sala Ocaña» → `sala-ocana`: la parte de la dirección web que identifica al espacio. */
export function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Un slug libre a partir del nombre: si ya existe, le añade `-2`, `-3`… */
export function freeSlug(name: string, taken: string[]): string {
  const base = slugify(name) || 'espacio';
  if (base.length < 2) return freeSlug(`${base}-espacio`, taken);
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}
