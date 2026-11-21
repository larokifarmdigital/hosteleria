'use client';

import { useId, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { MediaAsset } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import type { ImagePurpose } from '@/lib/media/imageChecks';
import { useMediaList } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { MediaPicker } from './MediaPicker';
import type { MediaScope } from './types';

interface Props {
  label: string;
  hint?: string;
  scope: MediaScope;
  purpose: Exclude<ImagePurpose, 'any'>;
  assetId: string | null;
  /** `null` = quitar la foto. */
  onChange: (asset: MediaAsset | null) => void;
  /** Enseña la descripción bajo la foto; sobra si el formulario ya tiene su propio campo. */
  showDescription?: boolean;
}

/** Foto asignada a un contenido, con los botones para elegirla, cambiarla o quitarla. */
export function ImageField({ label, hint, scope, purpose, assetId, onChange, showDescription }: Props) {
  const id = useId();
  const [picking, setPicking] = useState(false);
  const { data: media, isPending } = useMediaList({ restaurantSlug: scope.restaurantSlug });
  const asset = assetId ? media?.find(m => m.id === assetId) : undefined;
  const frame = cn(
    'flex-shrink-0 overflow-hidden rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]',
    purpose === 'hero' ? 'aspect-[16/9] w-full sm:w-[240px]' : 'h-[120px] w-[120px]'
  );

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <p id={`${id}-label`} className="m-0 mb-1.5 text-[13.5px] font-semibold text-[color:var(--color-ink)]">{label}</p>

      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.publicUrl} alt={asset.altText?.[scope.defaultLocale] ?? ''} className={cn(frame, 'object-cover')} />
        ) : (
          <div className={cn(frame, 'grid place-items-center border-dashed border-[color:var(--color-border-strong)] text-[color:var(--color-muted)]', assetId && isPending && 'animate-pulse motion-reduce:animate-none')}>
            {!(assetId && isPending) && (
              <span className="flex flex-col items-center gap-1 text-[12.5px] font-semibold">
                <ImageIcon aria-hidden className="h-5 w-5" />
                Sin foto
              </span>
            )}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={() => setPicking(true)}>{asset ? 'Cambiar foto' : 'Elegir foto'}</Button>
            {assetId && <Button className="min-h-11" variant="ghost" onClick={() => onChange(null)}>Quitar foto</Button>}
          </div>
          {showDescription && asset && (
            <p className="m-0 mt-2.5 text-[13px] leading-[1.5] text-[color:var(--color-ink-soft)]">
              <span className="font-semibold">Descripción:</span> {asset.altText?.[scope.defaultLocale]}
            </p>
          )}
          {hint && <p id={`${id}-hint`} className="m-0 mt-2.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">{hint}</p>}
        </div>
      </div>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        scope={scope}
        purpose={purpose}
        currentId={assetId}
        onSelect={picked => { setPicking(false); onChange(picked); }}
      />
    </div>
  );
}
