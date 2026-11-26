'use client';

import { Section } from '@/components/shared/Section';
import { SiteStatusCard } from '@/components/site/SiteStatusCard';
import { PendingTaskList } from '@/components/tasks/PendingTaskList';
import { usePendingTasks } from '@/lib/query/hooks';
import { useEditor } from './EditorContext';

/** Lo que antes era «Resumen»: estado de la web y lo que falta. Descartar está en el diálogo de publicar. */
export function StatusContent() {
  const { restaurant, localeNames } = useEditor();
  const { data: tasks, isPending } = usePendingTasks(restaurant.slug);
  // Lo que está sin publicar ya lo dice la barra de arriba; aquí, lo que falta completar.
  const todo = tasks?.filter(task => task.type !== 'unpublished');

  return (
    <div className="flex flex-col gap-6">
      <Section title="Lo que falta" description="Cada aviso lleva al sitio donde se arregla.">
        {isPending ? (
          <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-muted)]">Comprobando el contenido…</p>
        ) : todo && todo.length > 0 ? (
          <PendingTaskList slug={restaurant.slug} tasks={todo} localeNames={localeNames} />
        ) : (
          <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-ink-soft)]">Nada: no falta traducir ni completar nada.</p>
        )}
      </Section>

      <SiteStatusCard restaurant={restaurant} />
    </div>
  );
}
