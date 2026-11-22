'use client';

import { useRef } from 'react';
import type { Restaurant } from '@hosteleria/api-client';
import { Section } from '@/components/shared/Section';
import { usePendingTasks } from '@/lib/query/hooks';
import { PendingTaskList } from './PendingTaskList';

/** Sube cada vez que cambia el objeto: sirve para volver a preguntar tras guardar o publicar. */
function useChangeCount(value: unknown): number {
  const ref = useRef({ value, count: 0 });
  if (ref.current.value !== value) ref.current = { value, count: ref.current.count + 1 };
  return ref.current.count;
}

interface Props {
  restaurant: Restaurant;
  localeNames: Record<string, string>;
}

/**
 * En la ficha: lo que falta fuera de ella (espacios, carta, páginas legales y
 * fotos). Lo de la propia ficha ya se ve en sus pestañas y en el panel de publicación.
 */
export function PendingElsewhere({ restaurant, localeNames }: Props) {
  const { data } = usePendingTasks(restaurant.slug, useChangeCount(restaurant));
  const tasks = (data ?? []).filter(task => task.target.kind !== 'restaurant');
  if (tasks.length === 0) return null;

  return (
    <Section title="Pendiente" description="En los espacios, la carta, las páginas legales o las fotos de este restaurante.">
      <PendingTaskList slug={restaurant.slug} tasks={tasks} localeNames={localeNames} />
    </Section>
  );
}
