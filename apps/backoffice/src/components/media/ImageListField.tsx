'use client';

import { useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
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

const ICON_BUTTON =
  'grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[color:var(--color-border-strong)] disabled:hover:text-[color:var(--color-ink)]';

/** Varias fotos en orden: añadir, quitar y mover. */
export function ImageListField({ label, hint, scope, purpose, assetIds, onChange, max }: Props) {
  const id = useId();
  const [picking, setPicking] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
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
    // Tras mover, el botón pulsado puede haber quedado desactivado (primera o última).
    setTimeout(() => {
      const preferred = to < from ? 'prev' : 'next';
      const other = to < from ? 'next' : 'prev';
      const button = document.getElementById(`${id}-${to}-${preferred}`) as HTMLButtonElement | null;
      (button && !button.disabled ? button : document.getElementById(`${id}-${to}-${other}`))?.focus();
    }, 0);
  };

  const remove = (index: number) => {
    onChange(assetIds.filter((_, i) => i !== index));
    setAnnouncement('Foto quitada.');
    setTimeout(() => addRef.current?.focus(), 0);
  };

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <p id={`${id}-label`} className="m-0 mb-1.5 text-[13.5px] font-semibold text-[color:var(--color-ink)]">{label}</p>

      {assetIds.length > 0 && (
        <ol className="m-0 mb-3.5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {assetIds.map((assetId, index) => {
            const asset = media?.find(m => m.id === assetId);
            const name = nameOf(assetId, index);
            return (
              <li key={assetId} className="overflow-hidden rounded-[10px] border border-[color:var(--color-border)] bg-white">
                {asset ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.publicUrl} alt={asset.altText?.[scope.defaultLocale] ?? ''} loading="lazy" decoding="async" className="aspect-[4/3] w-full bg-[color:var(--color-surface-2)] object-cover" />
                ) : (
                  <div aria-hidden className="aspect-[4/3] w-full bg-[color:var(--color-surface-2)]" />
                )}
                <div className="flex items-center justify-between gap-2 p-2.5">
                  <span className="tabular text-[12.5px] font-semibold text-[color:var(--color-muted)]">{index + 1} de {assetIds.length}</span>
                  <div className="flex gap-2">
                    <button type="button" id={`${id}-${index}-prev`} className={ICON_BUTTON} disabled={index === 0} aria-label={`Mover antes: ${name}`} onClick={() => move(index, index - 1)}>
                      <ArrowLeft aria-hidden className="h-4 w-4" />
                    </button>
                    <button type="button" id={`${id}-${index}-next`} className={ICON_BUTTON} disabled={index === assetIds.length - 1} aria-label={`Mover después: ${name}`} onClick={() => move(index, index + 1)}>
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </button>
                    <button type="button" className={ICON_BUTTON} aria-label={`Quitar: ${name}`} onClick={() => remove(index)}>
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Button ref={addRef} className="min-h-11" disabled={full} onClick={() => setPicking(true)}>
        <Plus aria-hidden className="h-4 w-4" />
        Añadir foto
      </Button>
      {(hint || full) && (
        <p id={`${id}-hint`} className="m-0 mt-2.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
          {full ? `No caben más: el máximo son ${max}.` : hint}
        </p>
      )}
      <p role="status" className="sr-only">{announcement}</p>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        scope={scope}
        purpose={purpose}
        excludeIds={assetIds}
        onSelect={picked => { setPicking(false); onChange([...assetIds, picked.id]); setAnnouncement('Foto añadida.'); }}
      />
    </div>
  );
}
