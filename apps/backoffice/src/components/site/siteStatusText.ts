import type { SiteStatus } from '@hosteleria/api-client';
import { relativeTime } from '@/lib/utils';

export interface SiteStatusText {
  tone: 'ok' | 'busy' | 'warn';
  title: string;
  detail?: string;
}

const hostOf = (url: string | null) => url?.replace(/^https?:\/\//, '') ?? '';

/** El estado de la web dicho con las palabras del editor. `null` si no hay nada que decir. */
export function siteStatusText(site: SiteStatus): SiteStatusText | null {
  switch (site.state) {
    case 'unpublished':
      return null;
    case 'up_to_date':
      return {
        tone: 'ok',
        title: 'La web enseña lo último publicado',
        detail: site.builtAt ? `Se actualizó ${relativeTime(site.builtAt)}.` : undefined
      };
    case 'updating':
      return { tone: 'busy', title: 'La web se está actualizando', detail: 'Suele tardar uno o dos minutos. Puedes seguir trabajando.' };
    case 'outdated':
      return {
        tone: 'warn',
        title: 'La web todavía no enseña los últimos cambios',
        detail: !site.canRebuild
          ? 'Este restaurante no tiene configurada la actualización automática. Avisa a un administrador.'
          : site.lastRebuildOk === false
            ? 'No se pudo avisar a la web para que se actualizara. Prueba a actualizarla ahora.'
            : site.lastRebuildAt
              ? `Se pidió actualizarla ${relativeTime(site.lastRebuildAt)} y no ha terminado. Prueba a actualizarla ahora.`
              : 'Aún no se ha pedido actualizarla. Puedes hacerlo ahora.'
      };
    case 'unknown':
      return {
        tone: 'warn',
        title: 'No se ha podido comprobar la web',
        detail: site.siteUrl
          ? `${hostOf(site.siteUrl)} no responde o aún no dice con qué contenido se construyó. Comprueba que el dominio de la ficha es el de la web.`
          : 'El dominio de la ficha no es una dirección web válida.'
      };
  }
}
