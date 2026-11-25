'use client';

import { useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { MediaAsset } from '@hosteleria/api-client';
import { DragHandle, RowMenu, SortableList, useSortableItem } from '@/components/ui/Sortable';
import { cn } from '@/lib/utils';
import type { ImagePurpose } from '@/lib/media/imageChecks';
import { useMediaList } from '@/lib/query/hooks';
import { MediaPicker } from './MediaPicker';
import { mediaLabel, type MediaScope } from './types';

interface Props {
  label: string;
  hint?: string;
  scope: MediaScope;
  purpose: Exclude<ImagePurpose, 'any'>;
  /** Ids de las fotos, en el orden en que se enseñan. */
  assetIds: string[];
  onChange: (assetIds: string[]) => void;
  max: number;
}

/** Varias fotos en orden: se añaden con la casilla del final, se ordenan arrastrando y se quitan desde su menú. */
export function ImageListField({ label, hint, scope, purpose, assetIds, onChange, max }: Props) {
  const id = useId();
  const [picking, setPicking] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const { data: media } = useMediaList({ restaurantSlug: scope.restaurantSlug });
  const full = assetIds.length >= max;

  const nameOf = (assetId: string, index: number) => {
    const asset = media?.find(m => m.id === assetId);
    return asset ? mediaLabel(asset, scope.defaultLocale) : `Foto ${index + 1}`;
  };

  const move = (from: number, to: number) => {
    const next = [...assetIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setAnnouncement(`Foto movida a la posición ${to + 1} de ${assetIds.length}.`);
  };

  const remove = (index: number) => {
    onChange(assetIds.filter((_, i) => i !== index));
    setAnnouncement('Foto quitada.');
    // El botón de añadir puede no existir (lista llena): el foco se queda en el grupo.
    setTimeout(() => (addRef.current ?? groupRef.current)?.focus(), 0);
  };

  return (
    <div ref={groupRef} tabIndex={-1} role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} className="focus:outline-none">
      <p className="m-0 mb-1.5 text-[13.5px] font-medium text-[color:var(--color-ink-soft)]">
        <span id={`${id}-label`}>{label}</span>
        {assetIds.length > 0 && <span className="tabular font-normal text-[color:var(--color-muted)]"> · {assetIds.length}</span>}
      </p>

      <SortableList
        grid
        ids={assetIds}
        nameOf={assetId => nameOf(assetId, assetIds.indexOf(assetId))}
        disabled={assetIds.length < 2}
        onReorder={ids => onChange(ids)}
      >
        <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
          {assetIds.map((assetId, index) => (
            <Tile
              key={assetId}
              id={assetId}
              asset={media?.find(m => m.id === assetId)}
              alt={media?.find(m => m.id === assetId)?.altText?.[scope.defaultLocale] ?? ''}
              name={nameOf(assetId, index)}
              position={index + 1}
              sortable={assetIds.length > 1}
              onPrev={index > 0 ? () => move(index, index - 1) : undefined}
              onNext={index < assetIds.length - 1 ? () => move(index, index + 1) : undefined}
              onRemove={() => remove(index)}
            />
          ))}
          {!full && (
            <li>
              <button
                ref={addRef}
                type="button"
                onClick={() => setPicking(true)}
                className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed border-[color:var(--color-control)] bg-white px-2 text-center text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent-fg)]"
              >
                <Plus aria-hidden className="h-5 w-5" />
                {assetIds.length === 0 ? 'Añadir fotos' : 'Añadir más'}
              </button>
            </li>
          )}
        </ol>
      </SortableList>
      {(hint || full) && (
        <p id={`${id}-hint`} className="m-0 mt-2.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
          {full ? `Has llegado al máximo de ${max} fotos. Quita una para añadir otra.` : hint}
        </p>
      )}
      <p role="status" className="sr-only">{announcement}</p>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        scope={scope}
        purpose={purpose}
        excludeIds={assetIds}
        multiple={{
          max: max - assetIds.length,
          onSelectMany: picked => {
            setPicking(false);
            onChange([...assetIds, ...picked.map(asset => asset.id)]);
            setAnnouncement(picked.length === 1 ? 'Foto añadida.' : `${picked.length} fotos añadidas.`);
          }
        }}
      />
    </div>
  );
}

interface TileProps {
  id: string;
  asset?: MediaAsset;
  alt: string;
  name: string;
  position: number;
  sortable: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onRemove: () => void;
}

function Tile({ id, asset, alt, name, position, sortable, onPrev, onNext, onRemove }: TileProps) {
  const { container, handle, isDragging } = useSortableItem(id);
  return (
    <li ref={container.ref} style={container.style} className={cn('group relative overflow-hidden rounded-[10px] border bg-[color:var(--color-surface-2)]', isDragging ? 'border-[color:var(--color-border-strong)] shadow-[var(--shadow-md)]' : 'border-[color:var(--color-border)]')}>
      {asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.publicUrl} alt={alt} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
      ) : (
        <div aria-hidden className="aspect-square w-full" />
      )}
      <span className="tabular absolute bottom-1.5 left-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--color-ink-soft)] shadow-[var(--shadow-sm)]">
        <span className="sr-only">Posición </span>{position}
      </span>
      {sortable && <DragHandle handle={handle} name={name} className="absolute left-1.5 top-1.5 bg-white/95 text-[color:var(--color-ink-soft)] shadow-[var(--shadow-sm)] hover:bg-white" />}
      <RowMenu
        name={name}
        className="absolute right-1.5 top-1.5 bg-white/95 text-[color:var(--color-ink-soft)] shadow-[var(--shadow-sm)] hover:bg-white"
        actions={[
          ...(sortable ? [{ label: 'Mover antes', disabled: !onPrev, onSelect: () => onPrev?.() }, { label: 'Mover después', disabled: !onNext, onSelect: () => onNext?.() }] : []),
          { label: 'Quitar de aquí', danger: true, separated: sortable, onSelect: onRemove }
        ]}
      />
    </li>
  );
}
