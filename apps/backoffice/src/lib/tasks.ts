import type { PendingTask } from '@hosteleria/api-client';
import { localeList } from '@/lib/forms/translations';

export interface TaskLine {
  /** Estable entre recargas: sirve de `key`. */
  id: string;
  text: string;
  /** Ejemplos de lo que falta, cuando ayudan a encontrarlo. */
  detail?: string;
  href: string;
}

const AREA = {
  content: { label: 'la pestaña «Contenido»', tab: 'content' },
  uiTexts: { label: 'la pestaña «Textos de la web»', tab: 'texts' },
  search: { label: 'la pestaña «Buscadores»', tab: 'search' }
} as const;

const MENU = {
  dishes: { label: 'los platos', tipo: null },
  drinks: { label: 'las bebidas', tipo: 'bebidas' },
  wines: { label: 'los vinos', tipo: 'vinos' }
} as const;

const LEGAL: Record<string, string> = {
  'legal-notice': 'el aviso legal', privacy: 'la política de privacidad', cookies: 'la política de cookies'
};

/** Una tarea pendiente dicha con las palabras del editor, con el enlace al sitio donde se arregla. */
export function describeTask(task: PendingTask, slug: string, localeNames: Record<string, string>): TaskLine {
  const ficha = `/restaurants/${slug}`;
  const spaceHref = (spaceId: string) => `${ficha}/spaces/${spaceId}`;

  if (task.type === 'unpublished') {
    const isSpace = task.target.kind === 'space';
    const subject = task.target.kind === 'space' ? `El espacio «${task.target.spaceName}»` : 'La ficha del restaurante';
    return {
      id: `unpublished:${task.target.kind === 'space' ? task.target.spaceId : 'ficha'}`,
      text: task.neverPublished ? `${subject} aún no se ha publicado` : `${subject} tiene cambios sin publicar`,
      detail: task.neverPublished ? (isSpace ? 'Hasta entonces no sale en la web, ni su carta.' : 'Hasta entonces la web no enseña nada de este restaurante.') : undefined,
      href: task.target.kind === 'space' ? spaceHref(task.target.spaceId) : ficha
    };
  }

  if (task.type === 'no_schedule') {
    return {
      id: `no_schedule:${task.target.spaceId}`,
      text: `El espacio «${task.target.spaceName}» no tiene horario`,
      detail: 'La web lo enseña como cerrado toda la semana.',
      href: `${spaceHref(task.target.spaceId)}?tab=hours`
    };
  }

  const languages = localeList(task.locales, localeNames);

  if (task.type === 'image_descriptions') {
    return {
      id: 'image_descriptions',
      text: `${task.count === 1 ? 'Hay 1 foto en uso' : `Hay ${task.count} fotos en uso`} sin descripción`,
      detail: `${task.count === 1 ? 'Falta' : 'Faltan'} en ${languages}. La descripción es lo que oye quien no puede ver la foto.`,
      href: `/media?r=${slug}&ver=sin-descripcion`
    };
  }

  // Los idiomas se nombran como en el resto del backoffice: «Falta en català y english».
  const amount = task.count === 1 ? '1 texto sin traducir' : `${task.count} textos sin traducir`;
  const examples = [
    `${task.count === 1 ? 'Falta' : 'Faltan'} en ${languages}.`,
    ...(task.examples.length > 0 ? [`Por ejemplo: ${task.examples.join(', ')}${task.count > task.examples.length ? '…' : '.'}`] : [])
  ].join(' ');
  const t = task.target;
  if (t.kind === 'restaurant') {
    const area = AREA[t.area ?? 'content'];
    return { id: `translations:ficha:${area.tab}`, text: `${amount} en ${area.label}`, detail: examples, href: `${ficha}?tab=${area.tab}` };
  }
  if (t.kind === 'space') {
    return { id: `translations:space:${t.spaceId}`, text: `${amount} en el espacio «${t.spaceName}»`, detail: examples, href: spaceHref(t.spaceId) };
  }
  if (t.kind === 'menu') {
    const menu = MENU[t.menu];
    const query = new URLSearchParams({ r: slug, e: t.spaceId, ...(menu.tipo ? { tipo: menu.tipo } : {}), ver: 'sin-traducir' });
    return { id: `translations:${t.menu}:${t.spaceId}`, text: `${amount} en ${menu.label} de «${t.spaceName}»`, detail: examples, href: `/dishes?${query}` };
  }
  if (t.kind === 'legal') {
    return { id: `translations:legal:${t.legalType}`, text: `${amount} en ${LEGAL[t.legalType] ?? 'una página legal'}`, detail: examples, href: `${ficha}/legal/${t.legalType}` };
  }
  return { id: 'translations:otros', text: amount, detail: examples, href: ficha };
}
