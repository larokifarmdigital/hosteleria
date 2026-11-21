import { Pill } from '@/components/shared/Pill';

/** Aviso de sección: cuántos textos tienen traducción pendiente. Sin pendientes no pinta nada. */
export function TranslationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <Pill variant="warn" dot>{count === 1 ? 'Falta traducir 1 texto' : `Falta traducir ${count} textos`}</Pill>;
}
