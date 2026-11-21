'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, TriangleAlert } from 'lucide-react';
import type { MediaAsset } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { handleApiError } from '@/lib/api';
import { ACCEPT_ATTRIBUTE, checkImage, formatFileSize, readImageSize, type ImagePurpose, type ImageSize } from '@/lib/media/imageChecks';
import { optimizeImage } from '@/lib/media/optimize';
import { useMediaUpload } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';

type Status = 'preparing' | 'blocked' | 'review' | 'uploading' | 'error';

interface Item {
  key: string;
  file: File;
  previewUrl: string | null;
  size: ImageSize | null;
  /** Peso original en bytes, si la foto se ha reducido antes de subir. */
  reducedFrom?: number;
  status: Status;
  /** Por qué no se puede subir, o por qué falló la subida. */
  problem?: string;
  warnings: string[];
  /** De 0 a 100. */
  progress: number;
}

interface Props {
  restaurantSlug: string;
  purpose?: ImagePurpose;
  /** Varias fotos a la vez (pantalla de imágenes) o una sola (selector). */
  multiple?: boolean;
  onUploaded?: (asset: MediaAsset) => void;
}

let nextKey = 0;

/**
 * Zona para soltar fotos o elegirlas del dispositivo. Cada foto se reduce si es
 * más grande de lo necesario y se revisa antes de subir: si aun así pesa o mide
 * mal, espera a que el usuario decida; si no, sube sola.
 */
export function MediaUploader({ restaurantSlug, purpose = 'any', multiple = true, onUploaded }: Props) {
  const upload = useMediaUpload(restaurantSlug);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());
  const uploads = useRef(new Set<AbortController>());

  // Al salir de la pantalla a media subida, se cancela: `uploadMedia` borra lo que dejó a medias.
  useEffect(() => {
    const urls = previews.current;
    const controllers = uploads.current;
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
      controllers.forEach(controller => controller.abort());
    };
  }, []);

  const update = (key: string, changes: Partial<Item>) =>
    setItems(list => list.map(item => (item.key === key ? { ...item, ...changes } : item)));

  const remove = (item: Item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
      previews.current.delete(item.previewUrl);
    }
    setItems(list => list.filter(i => i.key !== item.key));
  };

  const start = async (item: Item) => {
    update(item.key, { status: 'uploading', progress: 0, problem: undefined });
    const controller = new AbortController();
    uploads.current.add(controller);
    try {
      const asset = await upload.mutateAsync({
        file: item.file,
        size: item.size,
        signal: controller.signal,
        onProgress: fraction => update(item.key, { progress: Math.round(fraction * 100) })
      });
      remove(item);
      setAnnouncement(`«${item.file.name}» se ha subido.`);
      onUploaded?.(asset);
    } catch (err) {
      update(item.key, { status: 'error', problem: handleApiError(err) });
      setAnnouncement(`No se ha podido subir «${item.file.name}».`);
    } finally {
      uploads.current.delete(controller);
    }
  };

  const addFiles = async (files: File[]) => {
    const pending: Item[] = (multiple ? files : files.slice(0, 1)).map(file => ({
      key: `upload-${nextKey++}`, file, previewUrl: null, size: null, status: 'preparing', warnings: [], progress: 0
    }));
    setItems(list => (multiple ? [...list, ...pending] : pending));

    // De una en una: reducir varias fotos de móvil a la vez dispara la memoria.
    for (const item of pending) {
      const optimized = await optimizeImage(item.file, await readImageSize(item.file));
      const check = checkImage(optimized.file, optimized.size, purpose);
      const previewUrl = optimized.size ? URL.createObjectURL(optimized.file) : null;
      if (previewUrl) previews.current.add(previewUrl);

      const ready: Item = {
        ...item,
        file: optimized.file,
        size: optimized.size,
        reducedFrom: optimized.reducedFrom,
        previewUrl,
        status: check.blocker ? 'blocked' : check.warnings.length > 0 ? 'review' : 'uploading',
        problem: check.blocker,
        warnings: check.warnings
      };
      update(item.key, ready);

      if (ready.status === 'uploading') void start(ready);
      else setAnnouncement(check.blocker ? `«${ready.file.name}» no se puede subir.` : `Revisa «${ready.file.name}» antes de subirla.`);
    }
  };

  const busy = items.some(i => i.status === 'uploading' || i.status === 'preparing');

  // Cerrar o recargar la pestaña a media subida dejaría la foto a medias.
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [busy]);

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          void addFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-[var(--radius)] border-2 border-dashed px-5 py-6 text-center transition-colors',
          dragging
            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]'
            : 'border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)]'
        )}
      >
        <ImagePlus aria-hidden className="h-6 w-6 text-[color:var(--color-accent)]" />
        <p className="m-0 text-[14px] font-semibold text-[color:var(--color-ink)]">
          {multiple ? 'Arrastra aquí las fotos, o elígelas de tu dispositivo' : 'Arrastra aquí una foto, o elígela de tu dispositivo'}
        </p>
        <Button className="min-h-11" disabled={!multiple && busy} onClick={() => inputRef.current?.click()}>
          {multiple ? 'Elegir fotos' : 'Elegir foto'}
        </Button>
        <p className="m-0 text-[12.5px] text-[color:var(--color-muted)]">JPG, PNG o WebP. Máximo 10 MB por foto.</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple={multiple}
          hidden
          onChange={e => {
            void addFiles(Array.from(e.target.files ?? []));
            // Vaciarlo permite volver a elegir el mismo archivo.
            e.target.value = '';
          }}
        />
      </div>

      <p role="status" className="sr-only">{announcement}</p>

      {items.length > 0 && (
        <ul aria-label="Fotos que estás subiendo" className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
          {items.map(item => (
            <li key={item.key} className="flex flex-wrap items-start gap-3 rounded-[10px] border border-[color:var(--color-border)] bg-white p-3">
              {item.previewUrl ? (
                // Decorativa: el nombre del archivo va al lado.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
              ) : item.status === 'preparing' ? (
                <span aria-hidden className="h-14 w-14 flex-shrink-0 animate-pulse rounded-lg bg-[color:var(--color-surface-2)] motion-reduce:animate-none" />
              ) : (
                <span aria-hidden className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]">
                  <TriangleAlert className="h-5 w-5" />
                </span>
              )}

              <div className="min-w-0 flex-[1_1_200px]">
                <p className="m-0 truncate text-[13.5px] font-semibold text-[color:var(--color-ink)]">{item.file.name}</p>
                <p className="tabular m-0 text-[12.5px] text-[color:var(--color-muted)]">
                  {item.status === 'preparing' ? 'Preparando…' : formatFileSize(item.file.size / 1024)}
                  {item.size && ` · ${item.size.width} × ${item.size.height} px`}
                </p>
                {item.reducedFrom !== undefined && (
                  <p className="m-0 text-[12.5px] text-[color:var(--color-ok-fg)]">
                    Reducida para la web: pesaba {formatFileSize(item.reducedFrom / 1024)}.
                  </p>
                )}

                {item.status === 'uploading' && (
                  <div className="mt-2 flex items-center gap-2.5">
                    <progress
                      aria-label={`Subiendo ${item.file.name}`}
                      value={item.progress}
                      max={100}
                      className="h-2 min-w-0 flex-1"
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <span aria-hidden className="tabular w-[92px] text-right text-[12.5px] font-semibold text-[color:var(--color-ink-soft)]">
                      {item.progress < 100 ? `${item.progress} %` : 'Comprobando…'}
                    </span>
                  </div>
                )}
                {item.problem && (
                  <p className="m-0 mt-1.5 text-[13px] font-medium text-[color:var(--color-danger)]">{item.problem}</p>
                )}
                {item.status === 'review' && (
                  <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
                    {item.warnings.map(warning => (
                      <li key={warning} className="flex gap-1.5 text-[13px] leading-[1.45] text-[color:var(--color-warn-fg)]">
                        <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {item.status !== 'uploading' && item.status !== 'preparing' && (
                <div className="flex flex-wrap gap-2">
                  {item.status === 'review' && (
                    <Button size="sm" aria-label={`Subir ${item.file.name} de todos modos`} onClick={() => void start(item)}>Subir de todos modos</Button>
                  )}
                  {item.status === 'error' && (
                    <Button size="sm" aria-label={`Reintentar la subida de ${item.file.name}`} onClick={() => void start(item)}>Reintentar</Button>
                  )}
                  <Button size="sm" variant="ghost" aria-label={`Quitar ${item.file.name}`} onClick={() => remove(item)}>Quitar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
