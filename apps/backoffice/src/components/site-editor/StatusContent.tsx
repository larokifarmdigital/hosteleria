'use client';

import { useState } from 'react';
import type { PendingTask } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Section } from '@/components/shared/Section';
import { SiteStatusCard } from '@/components/site/SiteStatusCard';
import { PendingTaskList } from '@/components/tasks/PendingTaskList';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSuccessToast } from '@/lib/api';
import { useDiscardRestaurant, useDiscardSpace, usePendingTasks } from '@/lib/query/hooks';
import { toForm as restaurantToForm } from '@/app/(app)/restaurants/[slug]/form/model';
import { useEditor, useRestaurantDraft, useSpaceDraft } from './EditorContext';
import { toForm as spaceToForm } from './spaceForm';

type Unpublished = Extract<PendingTask, { type: 'unpublished' }>;

/** Lo que antes era «Resumen»: estado de la web, lo que falta y deshacer lo no publicado. */
export function StatusContent() {
  const { restaurant, localeNames } = useEditor();
  const { data: tasks, isPending } = usePendingTasks(restaurant.slug);
  // Lo que está sin publicar ya lo dice la barra de arriba; aquí, lo que falta completar.
  const todo = tasks?.filter(task => task.type !== 'unpublished');
  const withChanges = (tasks ?? []).filter((t): t is Unpublished => t.type === 'unpublished' && !t.neverPublished);

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

      {withChanges.length > 0 && (
        <Section title="Deshacer cambios sin publicar" description="Vuelve a lo que se ve ahora en la web. No se puede deshacer.">
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {withChanges.map(task => (
              <li key={task.target.kind === 'space' ? task.target.spaceId : 'ficha'}>
                {task.target.kind === 'space'
                  ? <DiscardSpace spaceId={task.target.spaceId} name={task.target.spaceName} />
                  : <DiscardRestaurant />}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function DiscardRow({ label, pending, onConfirm }: { label: string; pending: boolean; onConfirm: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[color:var(--color-border)] px-4 py-2.5">
      <span className="text-[14px] font-semibold">{label}</span>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`Descartar los cambios de ${label}`}>Descartar cambios</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Descartar los cambios de ${label}?`}
        confirmLabel="Sí, descartar"
        pendingLabel="Descartando…"
        pending={pending}
        onConfirm={() => onConfirm().then(() => setOpen(false), () => {})}
      >
        <p className="m-0">Vuelve a lo que se ve ahora en la web. Lo demás no se toca.</p>
      </ConfirmDialog>
    </div>
  );
}

function DiscardRestaurant() {
  const { restaurant } = useEditor();
  const { form } = useRestaurantDraft();
  const discard = useDiscardRestaurant(restaurant.slug);
  return (
    <DiscardRow
      label="los datos del restaurante"
      pending={discard.isPending}
      onConfirm={() => discard.mutateAsync().then(r => { form.reset(restaurantToForm(r)); showSuccessToast('Has vuelto a lo publicado'); })}
    />
  );
}

function DiscardSpace({ spaceId, name }: { spaceId: string; name: string }) {
  const { restaurant, locales, space } = useEditor();
  const draft = useSpaceDraft();
  const discard = useDiscardSpace(restaurant.slug, spaceId);
  return (
    <DiscardRow
      label={`«${name}»`}
      pending={discard.isPending}
      onConfirm={() => discard.mutateAsync().then(s => {
        // Si es el espacio que está abierto, el formulario vuelve también a lo publicado.
        if (draft && space?.id === spaceId) draft.form.reset(spaceToForm(s, locales));
        showSuccessToast('Has vuelto a lo publicado');
      })}
    />
  );
}
