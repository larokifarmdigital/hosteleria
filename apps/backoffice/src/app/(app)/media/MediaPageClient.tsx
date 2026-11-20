'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { useMediaList } from '@/lib/query/hooks';

export function MediaPageClient() {
  const mediaQuery = useMediaList();
  const media = mediaQuery.data ?? [];

  return (
    <>
      <PageHeader title="Imágenes">Las fotos subidas para las webs.</PageHeader>

      <QueryBoundary queries={[mediaQuery]}>
      {media.length === 0 ? (
        <EmptyState title="Todavía no hay imágenes" />
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5 p-0">
          {media.map(m => (
            <li key={m.id} className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white">
              {/* Decorativa aquí: el nombre del archivo va justo debajo como texto. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.publicUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full bg-[color:var(--color-copper-100)] object-cover"
              />
              <div className="px-3 py-2">
                <p className="m-0 truncate text-[12.5px] font-semibold text-[color:var(--color-ink)]">{m.name}</p>
                <p className="tabular m-0 text-[12px] text-[color:var(--color-muted)]">{m.sizeKb} KB</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      </QueryBoundary>
    </>
  );
}
