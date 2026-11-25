'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MediaAsset } from '@hosteleria/api-client';
import { AltTextForm } from '@/components/media/AltTextForm';
import { MediaDeleteDialog } from '@/components/media/MediaDeleteDialog';
import { MediaUploader } from '@/components/media/MediaUploader';
import { mediaLabel, missingAltLocales, type MediaScope } from '@/components/media/types';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pill } from '@/components/shared/Pill';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { formatFileSize } from '@/lib/media/imageChecks';
import { useLanguages, useMediaList, useRestaurants } from '@/lib/query/hooks';
import { useCardHeading } from '@/components/shared/Section';

type Show = 'all' | 'missing';
type Action = { type: 'describe' | 'delete'; asset: MediaAsset } | null;

/** `slug` + `embedded`: dentro del editor de la web, con el restaurante fijo y sin cabecera. */
export function MediaPageClient({ slug: fixedSlug, embedded = false }: { slug?: string; embedded?: boolean } = {}) {
  const CardHeading = useCardHeading();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const restaurantsQuery = useRestaurants();
  const restaurants = restaurantsQuery.data ?? [];
  const restaurant = restaurants.find(r => r.slug === (fixedSlug ?? params.get('r'))) ?? (fixedSlug ? undefined : restaurants[0]);
  const slug = restaurant?.slug ?? '';

  const mediaQuery = useMediaList({ restaurantSlug: slug });
  const { data: languages = [] } = useLanguages();

  // Desde «Pendiente» se llega con la lista ya filtrada por las que no tienen descripción.
  const [show, setShow] = useState<Show>(() => (params.get('ver') === 'sin-descripcion' ? 'missing' : 'all'));
  // Fotos cuyo archivo no carga: subidas que no llegaron a terminar.
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action>(null);

  const scope: MediaScope = useMemo(() => ({
    restaurantSlug: slug,
    locales: (restaurant?.activeLocales ?? []) as string[],
    defaultLocale: (restaurant?.defaultLocale ?? 'es') as string,
    localeNames: Object.fromEntries(languages.map(l => [l.code as string, l.name]))
  }), [slug, restaurant, languages]);

  const media = mediaQuery.data ?? [];
  const missingCount = media.filter(m => missingAltLocales(m, scope.locales).length > 0).length;
  const visible = show === 'missing' ? media.filter(m => missingAltLocales(m, scope.locales).length > 0) : media;

  return (
    <>
      {!embedded && <PageHeader title="Imágenes">Las fotos de tu restaurante. Desde aquí las subes, las describes y borras las que ya no uses.</PageHeader>}

      <QueryBoundary queries={[restaurantsQuery]}>
        {!restaurant ? (
          <EmptyState title="Todavía no tienes ningún restaurante asignado">Pide a un administrador que te dé acceso al tuyo.</EmptyState>
        ) : (
          <>
            {!embedded && restaurants.length > 1 && (
              <Field id="media-restaurante" label="Restaurante" className="mb-5 sm:max-w-[320px]">
                {control => (
                  <Select
                    {...control}
                    value={slug}
                    onChange={e => { setShow('all'); router.replace(`${pathname}?r=${encodeURIComponent(e.target.value)}`, { scroll: false }); }}
                  >
                    {restaurants.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
                  </Select>
                )}
              </Field>
            )}

            <section aria-labelledby="media-upload" className="mb-8">
              <CardHeading id="media-upload" className="m-0 mb-2.5 text-[15px] font-bold tracking-[-0.005em]">Subir fotos</CardHeading>
              {/* Otro restaurante = otra cola de subida: sin la key, las fotos a medias irían al nuevo. */}
              <MediaUploader key={slug} restaurantSlug={slug} />
            </section>

            <section aria-labelledby="media-library">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <CardHeading id="media-library" className="m-0 text-[15px] font-bold tracking-[-0.005em]">
                  Fotos de {restaurant.name} <span className="font-normal text-[color:var(--color-muted)]">· {media.length}</span>
                </CardHeading>
                {missingCount > 0 && (
                  <Field id="media-mostrar" label="Mostrar" className="min-w-[200px]">
                    {control => (
                      <Select {...control} value={show} onChange={e => setShow(e.target.value as Show)}>
                        <option value="all">Todas</option>
                        <option value="missing">Sin descripción ({missingCount})</option>
                      </Select>
                    )}
                  </Field>
                )}
              </div>

              <QueryBoundary queries={[mediaQuery]}>
                {media.length === 0 ? (
                  <EmptyState title="Todavía no hay fotos">Sube la primera con el recuadro de arriba.</EmptyState>
                ) : (
                  <ul className="m-0 grid list-none grid-cols-2 gap-3.5 p-0 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                    {visible.map(m => {
                      const label = mediaLabel(m, scope.defaultLocale);
                      const needsAlt = missingAltLocales(m, scope.locales).length > 0;
                      return (
                        <li key={m.id} className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white">
                          {broken.has(m.id) ? (
                            <p className="m-0 grid aspect-square w-full place-items-center bg-[color:var(--color-surface-2)] px-3 text-center text-[12.5px] leading-[1.45] text-[color:var(--color-ink-soft)]">
                              No se puede mostrar. Seguramente la subida no terminó: bórrala y súbela de nuevo.
                            </p>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.publicUrl}
                              alt={m.altText?.[scope.defaultLocale] ?? ''}
                              loading="lazy"
                              decoding="async"
                              onError={() => setBroken(prev => new Set(prev).add(m.id))}
                              className="aspect-square w-full bg-[color:var(--color-copper-100)] object-cover"
                            />
                          )}
                          <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
                            <p className="m-0 truncate text-[12.5px] font-semibold text-[color:var(--color-ink)]">{m.name}</p>
                            <p className="tabular m-0 text-[12px] text-[color:var(--color-muted)]">
                              {formatFileSize(m.sizeKb)}
                              {m.width && m.height ? ` · ${m.width} × ${m.height} px` : ''}
                            </p>
                            {needsAlt && <Pill variant="warn" className="self-start">Falta descripción</Pill>}
                            <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                              <Button size="sm" aria-label={`${needsAlt ? 'Describir' : 'Cambiar la descripción de'} ${label}`} onClick={() => setAction({ type: 'describe', asset: m })}>
                                {needsAlt ? 'Describir' : 'Descripción'}
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`Borrar ${label}`} onClick={() => setAction({ type: 'delete', asset: m })}>
                                Borrar
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </QueryBoundary>
            </section>

            {action?.type === 'describe' && (
              <Modal open onClose={() => setAction(null)} size="lg" title="Descripción de la foto">
                <AltTextForm
                  asset={action.asset}
                  scope={scope}
                  submitLabel="Guardar descripción"
                  cancelLabel="Cancelar"
                  onCancel={() => setAction(null)}
                  onSaved={() => { showSuccessToast('Descripción guardada'); setAction(null); }}
                />
              </Modal>
            )}
            {action?.type === 'delete' && (
              <MediaDeleteDialog asset={action.asset} defaultLocale={scope.defaultLocale} onClose={() => setAction(null)} />
            )}
          </>
        )}
      </QueryBoundary>
    </>
  );
}
