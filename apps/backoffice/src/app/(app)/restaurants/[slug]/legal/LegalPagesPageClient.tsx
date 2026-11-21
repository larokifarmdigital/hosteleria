'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pill } from '@/components/shared/Pill';
import { missingLocales } from '@/lib/forms/translations';
import { useLegalPages, useRestaurant } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';
import { LEGAL_PAGES } from './legalPages';

export function LegalPagesPageClient({ slug }: { slug: string }) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: pages = [] } = useLegalPages(slug);

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant) return null;

  const locales = restaurant.activeLocales as string[];

  return (
    <>
      <Link
        href={`/restaurants/${restaurant.slug}`}
        className="-ml-2 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)]"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        {restaurant.name}
      </Link>

      <PageHeader title="Páginas legales">
        Los textos legales que enlaza el pie de la web. Si no tienes alguno, pídeselo a tu gestoría o abogado.
      </PageHeader>

      <ul className="m-0 flex max-w-[760px] list-none flex-col gap-3.5 p-0">
        {LEGAL_PAGES.map(info => {
          const page = pages.find(p => p.type === info.type);
          const incomplete = !!page && (missingLocales(page.title, locales).length > 0 || missingLocales(page.content, locales).length > 0);
          return (
            <li key={info.type}>
              <Link
                href={`/restaurants/${restaurant.slug}/legal/${info.type}`}
                className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white px-5 py-4 transition-colors hover:border-[color:var(--color-copper-300)]"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <strong className="text-[15px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">{info.title}</strong>
                    {!page && <Pill variant="plain">Sin escribir</Pill>}
                    {page && !incomplete && <Pill variant="ok" dot>Escrita</Pill>}
                    {incomplete && <Pill variant="warn" dot>Falta traducir</Pill>}
                  </span>
                  <span className="mt-1 block text-[13px] leading-[1.5] text-[color:var(--color-muted)]">{info.description}</span>
                  {page?.lastUpdated && (
                    <span className="mt-1 block text-[12.5px] text-[color:var(--color-muted)]">Última revisión: {formatDate(`${page.lastUpdated}T12:00:00`)}</span>
                  )}
                </span>
                <ChevronRight aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--color-muted)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
