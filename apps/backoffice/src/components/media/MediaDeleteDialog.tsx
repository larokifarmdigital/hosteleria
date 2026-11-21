'use client';

import type { MediaAsset, RestaurantMediaUse } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useDeleteMedia, useMediaReferences } from '@/lib/query/hooks';

interface Props {
  asset: MediaAsset;
  defaultLocale: string;
  onClose: () => void;
}

const RESTAURANT_USES: Record<RestaurantMediaUse, string> = {
  logo: 'logo',
  favicon: 'icono de la pestaña',
  appIcon: 'icono de la app',
  seo: 'imagen al compartir',
  about: 'sobre nosotros',
  groups: 'grupos y eventos',
  homeBlock: 'bloque destacado'
};

/** Antes de borrar comprueba dónde se usa la foto: si está en uso, lo dice y no deja borrarla. */
export function MediaDeleteDialog({ asset, defaultLocale, onClose }: Props) {
  const references = useMediaReferences(asset.id);
  const remove = useDeleteMedia();

  const uses = references.data
    ? [
        ...references.data.spaces.map(s => `Portada de «${s.name}»`),
        ...(references.data.galleries ?? []).map(s => `Galería de «${s.name}»`),
        ...(references.data.restaurant ?? []).map(use => `Ficha del restaurante: ${RESTAURANT_USES[use]}`),
        ...references.data.dishes.map(d => `Plato «${d.name[defaultLocale] ?? Object.values(d.name).find(Boolean) ?? 'sin nombre'}»`)
      ]
    : [];
  const inUse = uses.length > 0;

  const onDelete = () =>
    remove.mutateAsync(asset.id).then(() => { showSuccessToast('Foto borrada'); onClose(); }, () => {});

  return (
    <Modal
      open
      onClose={() => { if (!remove.isPending) onClose(); }}
      title={inUse ? 'Esta foto se está usando' : `¿Borrar «${asset.name}»?`}
    >
      {references.isPending ? (
        <p role="status" className="m-0 text-[14px] text-[color:var(--color-ink-soft)]">Comprobando si la foto se usa en algún sitio…</p>
      ) : references.isError ? (
        <>
          <p role="alert" className="m-0 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">
            No hemos podido comprobar si la foto se usa en algún sitio, así que no la borramos por si acaso.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            <Button variant="primary" disabled={references.isFetching} onClick={() => references.refetch()}>Volver a comprobar</Button>
          </div>
        </>
      ) : inUse ? (
        <>
          <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">Si la borras, estos sitios se quedarían sin foto:</p>
          <ul className="my-3 flex list-disc flex-col gap-1 pl-5 text-[14px] font-semibold text-[color:var(--color-ink)]">
            {uses.map(use => <li key={use}>{use}</li>)}
          </ul>
          <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">
            Cambia o quita la foto ahí primero. Si es una portada, publica el cambio; después podrás borrarla.
          </p>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={onClose}>Entendido</Button>
          </div>
        </>
      ) : (
        <>
          <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">No se usa en ningún sitio. Al borrarla no se puede recuperar.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" disabled={remove.isPending} onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={remove.isPending} onClick={onDelete}>{remove.isPending ? 'Borrando…' : 'Sí, borrar'}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
