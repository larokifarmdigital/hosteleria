'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { Table, Td } from '@/components/shared/Table';
import { ROW_ICON_BUTTON, RowMenu } from '@/components/ui/Sortable';
import type { Restaurant, Space } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pill } from '@/components/shared/Pill';
import { StatePill, spacePublication } from '@/components/shared/StatePill';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSuccessToast } from '@/lib/api';
import { useDeleteSpace, useUpdateSpace } from '@/lib/query/hooks';
import { spaceTypeLabel } from '@/lib/spaces';
import { AddSpaceDialog } from './AddSpaceDialog';
import { useCardHeading } from '@/components/shared/Section';

interface Props {
  restaurant: Restaurant;
  spaces: Space[];
}

/** Los espacios del restaurante: entrar a editarlos, añadir, ordenar, elegir el principal y eliminar. */
const SPACE_COLUMNS = [{ label: 'Espacio' }, { label: 'Tipo' }, { label: 'Estado' }, { label: 'Acciones', hidden: true }];

export function SpacesSection({ restaurant, spaces }: Props) {
  const CardHeading = useCardHeading();
  const slug = restaurant.slug;
  const ordered = [...spaces].sort((a, b) => a.order - b.order);
  const update = useUpdateSpace(slug);
  const remove = useDeleteSpace(slug);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Space | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const busy = update.isPending || remove.isPending;

  const move = async (index: number, to: number) => {
    const next = [...ordered];
    next.splice(to, 0, next.splice(index, 1)[0]);
    const moved = ordered[index];
    try {
      // Solo se guardan los que cambian de posición.
      await Promise.all(next.map((s, order) => (s.order === order ? null : update.mutateAsync({ id: s.id, body: { order } }))));
      setAnnouncement(`${moved.name} pasa a la posición ${to + 1} de ${ordered.length}.`);
    } catch {
      // El hook ya muestra el error.
    }
  };

  const makeDefault = (space: Space) =>
    update.mutateAsync({ id: space.id, body: { isDefault: true } })
      .then(() => { showSuccessToast('Espacio principal cambiado', `Ahora es «${space.name}».`); setAnnouncement(`${space.name} es ahora el espacio principal.`); }, () => {});

  return (
    <section aria-labelledby="espacios-titulo">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        {/* Dentro del editor la sección ya se llama «Espacios» y lo explica: el título queda solo para lectores de pantalla. */}
        <div className={CardHeading === 'h3' ? 'sr-only' : undefined}>
          <CardHeading id="espacios-titulo" className="m-0 text-[15px] font-bold tracking-[-0.005em]">Espacios</CardHeading>
          <p className="m-0 mt-1 text-[13px] text-[color:var(--color-muted)]">
            Cada espacio (sala, terraza, barra…) tiene su propia portada, horarios y carta.
          </p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setAdding(true)}>
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Añadir espacio
        </Button>
      </div>

      {ordered.length === 0 ? (
        <EmptyState title="Este restaurante aún no tiene espacios">
          Añade el primero para poder poner su portada, su horario y su carta.
        </EmptyState>
      ) : (
        <Table caption="Lista de espacios" columns={SPACE_COLUMNS}>
          {ordered.map((space, index) => (
            <tr key={space.id}>
              <Td>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <Link
                    href={`/restaurants/${slug}?s=cover&e=${space.id}`}
                    className="inline-flex min-h-8 items-center text-[14.5px] font-semibold tracking-[-0.01em] text-[color:var(--color-ink)] underline-offset-2 hover:underline"
                  >
                    {space.name}
                  </Link>
                  {space.isDefault && ordered.length > 1 && <Pill variant="accent">Principal</Pill>}
                  {space.isDefault && ordered.length > 1 && <span className="sr-only">: es el que la web enseña primero</span>}
                </div>
              </Td>
              <Td className="text-[color:var(--color-muted)]">{spaceTypeLabel(space.type)}</Td>
              <Td><StatePill publication={spacePublication(space)} /></Td>
              <Td className="w-[1%] whitespace-nowrap">
                <div className="flex justify-end gap-1">
                  <Link href={`/restaurants/${slug}?s=cover&e=${space.id}`} aria-label={`Editar ${space.name}`} title="Editar" className={ROW_ICON_BUTTON}>
                    <Pencil aria-hidden className="h-[18px] w-[18px]" />
                  </Link>
                  {/* Lo ocasional (ordenar, cambiar el principal, eliminar), en el menú de la fila. */}
                  {ordered.length > 1 && (
                    <RowMenu
                      name={space.name}
                      actions={[
                        ...(space.isDefault ? [] : [{ label: 'Hacer principal', disabled: busy, onSelect: () => void makeDefault(space) }]),
                        { label: 'Subir', disabled: index === 0 || busy, onSelect: () => void move(index, index - 1) },
                        { label: 'Bajar', disabled: index === ordered.length - 1 || busy, onSelect: () => void move(index, index + 1) },
                        { label: 'Eliminar', danger: true, separated: true, disabled: busy, onSelect: () => setDeleting(space) }
                      ]}
                    />
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
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
          Se borran también su portada, su horario y toda su carta (platos, bebidas y vinos). Las fotos se conservan. No se puede deshacer.
        </p>
        {deleting?.isDefault && <p className="m-0 mt-2">Es el espacio principal: pasará a serlo el siguiente de la lista.</p>}
        {deleting?.state === 'published' && <p className="m-0 mt-2">Está publicado: seguirá en tu web hasta que pulses «Publicar cambios».</p>}
      </ConfirmDialog>
    </section>
  );
}
