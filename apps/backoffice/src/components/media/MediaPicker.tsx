'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { MediaAsset } from '@hosteleria/api-client';
import { Pill } from '@/components/shared/Pill';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { Modal } from '@/components/ui/Modal';
import type { ImagePurpose } from '@/lib/media/imageChecks';
import { useMediaList } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { AltTextForm } from './AltTextForm';
import { MediaUploader } from './MediaUploader';
import { mediaLabel, missingAltLocales, type MediaScope } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  scope: MediaScope;
  purpose: Exclude<ImagePurpose, 'any'>;
  /** Foto asignada ahora mismo, para marcarla. */
  currentId?: string | null;
  /** Siempre llega con descripción en todos los idiomas del restaurante. */
  onSelect: (asset: MediaAsset) => void;
}

/**
 * Elegir una foto del restaurante o subir una nueva. Una foto sin descripción
 * en algún idioma pasa antes por el paso de describirla: no se puede asignar sin ella.
 */
export function MediaPicker({ open, onClose, scope, purpose, currentId, onSelect }: Props) {
  const mediaQuery = useMediaList({ restaurantSlug: scope.restaurantSlug });
  const media = mediaQuery.data ?? [];
  const [describing, setDescribing] = useState<MediaAsset | null>(null);

  const close = () => { setDescribing(null); onClose(); };
  const choose = (asset: MediaAsset) => {
    if (missingAltLocales(asset, scope.locales).length > 0) setDescribing(asset);
    else { setDescribing(null); onSelect(asset); }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={describing ? 'Describe la foto' : 'Elegir foto'}
      description={describing ? 'Hace falta una descripción para poder usarla.' : 'Sube una nueva o elige una de las que ya tienes.'}
    >
      {describing ? (
        <AltTextForm
          asset={describing}
          scope={scope}
          submitLabel="Guardar y usar esta foto"
          cancelLabel="Volver a las fotos"
          onCancel={() => setDescribing(null)}
          onSaved={asset => { setDescribing(null); onSelect(asset); }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="picker-upload">
            <h3 id="picker-upload" className="m-0 mb-2.5 text-[14px] font-bold">Subir nueva</h3>
            <MediaUploader restaurantSlug={scope.restaurantSlug} purpose={purpose} multiple={false} onUploaded={choose} />
          </section>

          <section aria-labelledby="picker-library">
            <h3 id="picker-library" className="m-0 mb-2.5 text-[14px] font-bold">Tus fotos</h3>
            <QueryBoundary queries={[mediaQuery]}>
              {media.length === 0 ? (
                <p className="m-0 text-[13.5px] text-[color:var(--color-muted)]">Todavía no has subido ninguna foto.</p>
              ) : (
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
                  {media.map(asset => {
                    const isCurrent = asset.id === currentId;
                    const needsAlt = missingAltLocales(asset, scope.locales).length > 0;
                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          aria-label={`Usar la foto: ${mediaLabel(asset, scope.defaultLocale)}${isCurrent ? ' (la actual)' : ''}`}
                          onClick={() => choose(asset)}
                          className={cn(
                            'relative block w-full cursor-pointer overflow-hidden rounded-[10px] border-2 bg-white p-0 text-left transition-colors hover:border-[color:var(--color-accent)]',
                            isCurrent ? 'border-[color:var(--color-accent)]' : 'border-[color:var(--color-border)]'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.publicUrl} alt="" loading="lazy" decoding="async" className="aspect-square w-full bg-[color:var(--color-copper-100)] object-cover" />
                          {isCurrent && (
                            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-accent-fg)] px-2 py-0.5 text-[11px] font-semibold text-white">
                              <Check aria-hidden className="h-3 w-3" />
                              Actual
                            </span>
                          )}
                          <span className="block px-2.5 py-2">
                            <span className="block truncate text-[12.5px] font-semibold text-[color:var(--color-ink)]">{asset.name}</span>
                            {needsAlt && <Pill variant="warn" className="mt-1">Falta descripción</Pill>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </QueryBoundary>
          </section>
        </div>
      )}
    </Modal>
  );
}
