'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { LegalPageType } from '@hosteleria/api-client';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguages, useLegalPages, useRestaurant } from '@/lib/query/hooks';
import { legalPageInfo } from '../legalPages';
import { LegalPageForm } from './LegalPageForm';

export function LegalPageEditorClient({ slug, type }: { slug: string; type: LegalPageType }) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: pages } = useLegalPages(slug);
  const { data: languages = [] } = useLanguages();
  const info = legalPageInfo(type);

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant || !pages || !info) return null;

  const localeNames = Object.fromEntries(languages.map(l => [l.code, l.name]));

  return (
    <>
      <Link
        href={`/restaurants/${restaurant.slug}/legal`}
        className="-ml-2 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)]"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Páginas legales
      </Link>

      <PageHeader title={info.title}>{info.description}</PageHeader>

      <LegalPageForm restaurant={restaurant} type={type} title={info.title} page={pages.find(p => p.type === type) ?? null} localeNames={localeNames} />
    </>
  );
}
