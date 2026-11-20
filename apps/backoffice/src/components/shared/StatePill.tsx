import type { PublishState } from '@hosteleria/api-client';
import { Pill } from './Pill';

const LABEL: Record<PublishState, string> = {
  published: 'Publicado',
  draft: 'Borrador',
  warnings: 'Con avisos',
  new: 'Nuevo'
};
const VARIANT: Record<PublishState, 'ok' | 'warn' | 'plain'> = {
  published: 'ok',
  draft: 'warn',
  warnings: 'warn',
  new: 'plain'
};

export function StatePill({ state, className }: { state: PublishState; className?: string }) {
  return (
    <Pill variant={VARIANT[state]} dot className={className}>
      {LABEL[state]}
    </Pill>
  );
}
