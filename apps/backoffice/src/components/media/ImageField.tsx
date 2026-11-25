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
      <p id={`${id}-label`} className="m-0 mb-1.5 text-[13.5px] font-medium text-[color:var(--color-ink-soft)]">{label}</p>

      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.publicUrl} alt={asset.altText?.[scope.defaultLocale] ?? ''} className={cn(frame, purpose === 'logo' ? 'object-contain p-2' : 'object-cover')} />
        ) : (
          assetId && isPending ? (
            <div className={cn(frame, 'animate-pulse motion-reduce:animate-none')} />
          ) : (
            // Sin foto, el propio hueco es el botón de elegirla.
            <button
              type="button"
              onClick={() => setPicking(true)}
              className={cn(frame, 'flex cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[color:var(--color-control)] bg-white text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent-fg)]')}
            >
              <ImageIcon aria-hidden className="h-5 w-5" />
              Elegir foto
            </button>
          )
        )}

        <div className="min-w-0">
          {assetId && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPicking(true)}>Cambiar foto</Button>
              <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Quitar foto</Button>
            </div>
          )}
          {showDescription && asset && (
            <p className="m-0 mt-2.5 text-[13px] leading-[1.5] text-[color:var(--color-ink-soft)]">
              <span className="font-semibold">Descripción:</span> {asset.altText?.[scope.defaultLocale]}
            </p>
          )}
          {hint && <p id={`${id}-hint`} className="m-0 mt-2.5 max-w-[46ch] text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">{hint}</p>}
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
