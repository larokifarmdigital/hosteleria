'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { MediaAsset } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { Modal } from '@/components/ui/Modal';
import { RowMenu } from '@/components/ui/Sortable';
import type { ImagePurpose } from '@/lib/media/imageChecks';
import { useMediaList } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { AltTextForm } from './AltTextForm';
import { MediaDeleteDialog } from './MediaDeleteDialog';
import { MediaUploader } from './MediaUploader';
import { mediaLabel, missingAltLocales, type MediaScope } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  scope: MediaScope;
  purpose: Exclude<ImagePurpose, 'any'>;
  /** Foto asignada ahora mismo, para marcarla. */
  currentId?: string | null;
  /** Fotos que ya están en la lista a la que se añade: no se ofrecen otra vez. */
  excludeIds?: string[];
  /** Siempre llega con descripción en todos los idiomas del restaurante. */
  onSelect?: (asset: MediaAsset) => void;
  /** Para listas de fotos: se marcan varias y se añaden juntas, hasta `max`. */
  multiple?: { max: number; onSelectMany: (assets: MediaAsset[]) => void };
}

/**
 * Elegir una foto del restaurante o subir una nueva. Una foto sin descripción
 * en algún idioma pasa antes por el paso de describirla: no se puede asignar sin ella.
 * Desde aquí también se cambia la descripción de una foto o se borra (menú «⋯» de cada una):
 * ya no hay una pantalla aparte con todas las fotos.
 */
export function MediaPicker({ open, onClose, scope, purpose, currentId, excludeIds, onSelect, multiple }: Props) {
  const mediaQuery = useMediaList({ restaurantSlug: scope.restaurantSlug });
  const media = (mediaQuery.data ?? []).filter(m => !excludeIds?.includes(m.id));
  // `use`: tras describirla se usa; `edit`: solo se cambia la descripción y se vuelve a las fotos.
  const [describing, setDescribing] = useState<{ asset: MediaAsset; then: 'use' | 'edit' } | null>(null);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  // Solo en modo `multiple`: ids marcados, en el orden en que se marcaron.
  const [picked, setPicked] = useState<string[]>([]);
  const full = !!multiple && picked.length >= multiple.max;

  const close = () => { setDescribing(null); setPicked([]); onClose(); };
  const use = (asset: MediaAsset) => {
    setDescribing(null);
    if (!multiple) return onSelect?.(asset);
    setPicked(ids => (ids.includes(asset.id) ? ids.filter(id => id !== asset.id) : ids.length < multiple.max ? [...ids, asset.id] : ids));
  };
  const choose = (asset: MediaAsset) => {
    // Desmarcar no necesita descripción; marcar o usar, sí.
    if (!picked.includes(asset.id) && missingAltLocales(asset, scope.locales).length > 0) setDescribing({ asset, then: 'use' });
    else use(asset);
  };
  const addPicked = () => {
    const assets = picked.map(id => mediaQuery.data?.find(m => m.id === id)).filter((m): m is MediaAsset => !!m);
    setPicked([]);
    multiple?.onSelectMany(assets);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={describing ? 'Describe la foto' : multiple ? 'Elegir fotos' : 'Elegir foto'}
      description={describing?.then === 'edit' ? 'Lo que oye quien no puede ver la foto. Cambia en todos los sitios donde se usa.' : describing ? 'Hace falta una descripción para poder usarla.' : multiple ? 'Marca las que quieras añadir, o sube nuevas.' : 'Sube una nueva o elige una de las que ya tienes.'}
    >
      {describing ? (
        <AltTextForm
          asset={describing.asset}
          scope={scope}
          submitLabel={describing.then === 'edit' ? 'Guardar descripción' : multiple ? 'Guardar y marcar esta foto' : 'Guardar y usar esta foto'}
          cancelLabel="Volver a las fotos"
          onCancel={() => setDescribing(null)}
          onSaved={describing.then === 'edit' ? () => setDescribing(null) : use}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="picker-upload">
            <h3 id="picker-upload" className="m-0 mb-2.5 text-[14px] font-bold">{multiple ? 'Subir nuevas' : 'Subir nueva'}</h3>
            {/* Con varias a la vez, las subidas quedan abajo, en «Tus fotos», para describirlas y marcarlas. */}
            <MediaUploader restaurantSlug={scope.restaurantSlug} purpose={purpose} multiple={!!multiple} onUploaded={multiple ? undefined : choose} />
          </section>

          <section aria-labelledby="picker-library">
            <h3 id="picker-library" className="m-0 mb-2.5 text-[14px] font-bold">Tus fotos</h3>
            <QueryBoundary queries={[mediaQuery]}>
              {media.length === 0 ? (
                <p className="m-0 text-[13.5px] text-[color:var(--color-muted)]">
                  {mediaQuery.data?.length ? 'Ya has añadido todas tus fotos. Sube una nueva si necesitas más.' : 'Todavía no has subido ninguna foto.'}
                </p>
              ) : (
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
                  {media.map(asset => {
                    const isCurrent = asset.id === currentId;
                    const needsAlt = missingAltLocales(asset, scope.locales).length > 0;
                    const isPicked = picked.includes(asset.id);
                    const label = mediaLabel(asset, scope.defaultLocale);
                    return (
                      <li key={asset.id} className="relative">
                        <button
                          type="button"
                          aria-label={multiple ? `Marcar la foto: ${label}` : `Usar la foto: ${label}${isCurrent ? ' (la actual)' : ''}`}
                          aria-pressed={multiple ? isPicked : undefined}
                          disabled={full && !isPicked}
                          onClick={() => choose(asset)}
                          className={cn(
                            'relative block w-full cursor-pointer overflow-hidden rounded-[10px] border-2 bg-white p-0 text-left transition-colors hover:border-[color:var(--color-accent)] disabled:cursor-default disabled:opacity-50 disabled:hover:border-[color:var(--color-border)]',
                            isCurrent || isPicked ? 'border-[color:var(--color-accent)]' : 'border-[color:var(--color-border)]'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.publicUrl} alt="" loading="lazy" decoding="async" className="aspect-square w-full bg-[color:var(--color-copper-100)] object-cover" />
                          {isPicked && (
                            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-accent-fg)] px-2 py-0.5 text-[11px] font-semibold text-white">
                              <Check aria-hidden className="h-3 w-3" />
                              {picked.indexOf(asset.id) + 1}
                            </span>
                          )}
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
                        <RowMenu
                          name={label}
                          className="absolute right-1.5 top-1.5 border border-[color:var(--color-border)] bg-white/95 text-[color:var(--color-ink-soft)] shadow-[var(--shadow-sm)] hover:bg-white"
                          actions={[
                            { label: needsAlt ? 'Describir' : 'Cambiar la descripción', onSelect: () => setDescribing({ asset, then: 'edit' }) },
                            { label: 'Borrar', danger: true, separated: true, onSelect: () => setDeleting(asset) }
                          ]}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </QueryBoundary>
          </section>

          {multiple && (
            <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border)] bg-white px-5 py-3.5">
              <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-ink-soft)]">
                {picked.length === 0
                  ? 'Ninguna foto marcada.'
                  : `${picked.length === 1 ? '1 foto marcada' : `${picked.length} fotos marcadas`}${full ? `: no caben más (máximo ${multiple.max}).` : '.'}`}
              </p>
              <Button variant="primary" disabled={picked.length === 0} onClick={addPicked}>
                {picked.length <= 1 ? 'Añadir foto' : `Añadir ${picked.length} fotos`}
              </Button>
            </div>
          )}
        </div>
      )}
      {deleting && <MediaDeleteDialog asset={deleting} defaultLocale={scope.defaultLocale} onClose={() => setDeleting(null)} />}
    </Modal>
  );
}
