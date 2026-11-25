import type { Restaurant, Space } from '@hosteleria/api-client';
import { Pill } from './Pill';

/** Lo que importa a quien edita: si la web enseña lo último que guardó. */
export type Publication = 'published' | 'changes' | 'never';

const LABEL: Record<Publication, string> = {
  published: 'Publicado',
  changes: 'Cambios sin publicar',
  never: 'Sin publicar'
};
const VARIANT: Record<Publication, 'ok' | 'warn' | 'plain'> = {
  published: 'ok',
  changes: 'warn',
  never: 'plain'
};

/** El restaurante cuenta con sus espacios: un espacio sin publicar es un cambio que la web no enseña. */
export function restaurantPublication(r: Pick<Restaurant, 'state' | 'publishedSnapshot' | 'lastPublishedAt' | 'unpublishedSpacesCount'>): Publication {
  if (!r.publishedSnapshot && !r.lastPublishedAt) return 'never';
  return r.state === 'published' && (r.unpublishedSpacesCount ?? 0) === 0 ? 'published' : 'changes';
}

export function spacePublication(s: Pick<Space, 'state' | 'publishedSnapshot'>): Publication {
  if (!s.publishedSnapshot) return 'never';
  return s.state === 'published' ? 'published' : 'changes';
}

export function StatePill({ publication, className }: { publication: Publication; className?: string }) {
  return (
    <Pill variant={VARIANT[publication]} dot className={className}>
      {LABEL[publication]}
    </Pill>
  );
}
