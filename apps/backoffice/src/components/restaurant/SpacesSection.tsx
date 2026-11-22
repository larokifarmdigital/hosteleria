'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import type { Restaurant, Space } from '@hosteleria/api-client';
import { Button, LinkButton } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pill } from '@/components/shared/Pill';
import { StatePill } from '@/components/shared/StatePill';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSuccessToast } from '@/lib/api';
import { useDeleteSpace, useUpdateSpace } from '@/lib/query/hooks';
import { spaceTypeLabel } from '@/lib/spaces';
import { AddSpaceDialog } from './AddSpaceDialog';

const ICON_BUTTON =
  'grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[color:var(--color-border-strong)] disabled:hover:text-[color:var(--color-ink)]';

interface Props {
  restaurant: Restaurant;
  spaces: Space[];
}

/** Los espacios del restaurante: entrar a editarlos, añadir, ordenar, elegir el principal y eliminar. */
export function SpacesSection({ restaurant, spaces }: Props) {
  const slug = restaurant.slug;
  const ordered = [...spaces].sort((a, b) => a.order - b.order);
  const update = useUpdateSpace(slug);
  const remove = useDeleteSpace(slug);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Space | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const busy = update.isPending || remove.isPending;

  // Mientras se guarda, los botones están desactivados y el foco se pierde: se devuelve
  // cuando la lista ya llega recolocada. Si el botón pulsado ha quedado desactivado
  // (primero o último), pasa al otro.
  const [focusAfterMove, setFocusAfterMove] = useState<{ id: string; index: number; pressed: 'up' | 'down' } | null>(null);
  const settled = !!focusAfterMove && !busy && ordered[focusAfterMove.index]?.id === focusAfterMove.id;
  useEffect(() => {
    if (!settled || !focusAfterMove) return;
    const { id, pressed } = focusAfterMove;
    const button = document.getElementById(`space-${id}-${pressed}`) as HTMLButtonElement | null;
    (button && !button.disabled ? button : document.getElementById(`space-${id}-${pressed === 'up' ? 'down' : 'up'}`))?.focus();
    setFocusAfterMove(null);
  }, [settled, focusAfterMove]);

  const move = async (index: number, to: number) => {
    const next = [...ordered];
    next.splice(to, 0, next.splice(index, 1)[0]);
    const pressed = to < index ? 'up' : 'down';
    const moved = ordered[index];
    try {
      // Solo se guardan los que cambian de posición.
      await Promise.all(next.map((s, order) => (s.order === order ? null : update.mutateAsync({ id: s.id, body: { order } }))));
      setAnnouncement(`${moved.name} pasa a la posición ${to + 1} de ${ordered.length}.`);
      setFocusAfterMove({ id: moved.id, index: to, pressed });
    } catch {
      // El hook ya muestra el error.
    }
  };

  const makeDefault = (space: Space) =>
    update.mutateAsync({ id: space.id, body: { isDefault: true } })
      .then(() => { showSuccessToast('Espacio principal cambiado', `Ahora es «${space.name}».`); setAnnouncement(`${space.name} es ahora el espacio principal.`); }, () => {});

  return (
    <section aria-labelledby="espacios-titulo" className="mb-8">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="espacios-titulo" className="m-0 text-[15px] font-bold tracking-[-0.005em]">Espacios</h2>
          <p className="m-0 mt-1 text-[13px] text-[color:var(--color-muted)]">
            Cada espacio (sala, terraza, barra…) tiene su propia portada, horarios y carta.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden className="h-4 w-4" />
          Añadir espacio
        </Button>
      </div>

      {ordered.length === 0 ? (
        <EmptyState title="Este restaurante aún no tiene espacios">
          Añade el primero para poder poner su portada, su horario y su carta.
        </EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {ordered.map((space, index) => (
            <li key={space.id} className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white px-4 py-3 shadow-[var(--shadow-sm)] sm:px-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="min-w-0 flex-[1_1_220px]">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <Link
                      href={`/restaurants/${slug}/spaces/${space.id}`}
                      className="inline-flex min-h-8 items-center text-[15px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)] underline-offset-2 hover:underline"
                    >
                      {space.name}
                    </Link>
                    <StatePill state={space.state} />
                    {space.isDefault && <Pill variant="accent">Principal</Pill>}
                    {space.isDefault && ordered.length > 1 && <span className="sr-only">: es el que la web enseña primero</span>}
                  </div>
                  <p className="m-0 mt-0.5 text-[13px] text-[color:var(--color-muted)]">
                    {spaceTypeLabel(space.type)}{space.descriptor ? ` · ${space.descriptor}` : ''}
                  </p>
                </div>

                {/* Lo de todos los días (editar, carta) a la vista; lo ocasional, más discreto. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  {ordered.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1 sm:mr-1">
                      {!space.isDefault && (
                        <Button size="sm" variant="ghost" disabled={busy} aria-label={`Hacer principal: ${space.name}`} onClick={() => makeDefault(space)}>
                          Hacer principal
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy} aria-label={`Eliminar el espacio ${space.name}`} onClick={() => setDeleting(space)}>
                        Eliminar
                      </Button>
                    </div>
                  )}
                  {ordered.length > 1 && (
                    <>
                      <button type="button" id={`space-${space.id}-up`} className={ICON_BUTTON} disabled={index === 0 || busy} aria-label={`Subir: ${space.name}`} onClick={() => move(index, index - 1)}>
                        <ArrowUp aria-hidden className="h-4 w-4" />
                      </button>
                      <button type="button" id={`space-${space.id}-down`} className={ICON_BUTTON} disabled={index === ordered.length - 1 || busy} aria-label={`Bajar: ${space.name}`} onClick={() => move(index, index + 1)}>
                        <ArrowDown aria-hidden className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <LinkButton href={`/dishes?r=${slug}&e=${space.id}`} aria-label={`Carta de ${space.name}`}>Carta</LinkButton>
                  <LinkButton variant="primary" href={`/restaurants/${slug}/spaces/${space.id}`} aria-label={`Editar ${space.name}`}>Editar</LinkButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="sr-only">{announcement}</p>

      {adding && <AddSpaceDialog restaurantSlug={slug} spaces={spaces} onClose={() => setAdding(false)} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => { if (!open) setDeleting(null); }}
        title={deleting ? `¿Eliminar el espacio «${deleting.name}»?` : ''}
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando…"
        pending={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutateAsync(deleting.id).then(() => { showSuccessToast('Espacio eliminado'); setDeleting(null); }, () => {});
        }}
      >
        <p className="m-0">
          Se borran también su portada, su horario y toda su carta (platos, bebidas y vinos). Las fotos se conservan en «Imágenes». No se puede deshacer.
        </p>
        {deleting?.isDefault && <p className="m-0 mt-2">Es el espacio principal: pasará a serlo el siguiente de la lista.</p>}
        {deleting?.state === 'published' && <p className="m-0 mt-2">Está publicado: desaparecerá de la web en un par de minutos.</p>}
      </ConfirmDialog>
    </section>
  );
}
