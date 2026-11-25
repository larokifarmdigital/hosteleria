'use client';

import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { LegalPageType } from '@hosteleria/api-client';
import { Pill } from '@/components/shared/Pill';
import { missingLocales } from '@/lib/forms/translations';
import { useLegalPages } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';
import { LEGAL_PAGES, legalPageInfo } from '@/app/(app)/restaurants/[slug]/legal/legalPages';
import { LegalPageForm } from '@/app/(app)/restaurants/[slug]/legal/[type]/LegalPageForm';
import { useEditor } from './EditorContext';

const ROW =
  'flex w-full cursor-pointer items-center justify-between gap-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white px-5 py-4 text-left transition-colors hover:border-[color:var(--color-copper-300)]';

/** Aviso legal, privacidad y cookies: no tienen borrador, salen en la web al guardarlos. */
export function LegalSection() {
  const { restaurant, locales, localeNames, legalPage, goTo } = useEditor();
  const { data: pages = [] } = useLegalPages(restaurant.slug);
  const info = legalPage ? legalPageInfo(legalPage as LegalPageType) : null;

  if (info) {
    return (
      <div>
        <button
          type="button"
          onClick={() => goTo('legal', { p: null })}
          className="-ml-2 mb-4 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-[13.5px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)]"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          Todos los textos legales
        </button>
        <h3 className="m-0 mb-1 text-[18px] font-bold tracking-[-0.01em]">{info.title}</h3>
        <p className="m-0 mb-5 text-[13.5px] leading-[1.5] text-[color:var(--color-muted)]">{info.description}</p>
        <LegalPageForm
          key={info.type}
          restaurant={restaurant}
          type={info.type}
          title={info.title}
          page={pages.find(p => p.type === info.type) ?? null}
          localeNames={localeNames}
        />
      </div>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {LEGAL_PAGES.map(item => {
        const page = pages.find(p => p.type === item.type);
        const incomplete = !!page && (missingLocales(page.title, locales).length > 0 || missingLocales(page.content, locales).length > 0);
        return (
          <li key={item.type}>
            <button type="button" className={ROW} onClick={() => goTo('legal', { p: item.type })}>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <strong className="text-[15px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">{item.title}</strong>
                  {!page && <Pill variant="plain">Sin escribir</Pill>}
                  {page && !incomplete && <Pill variant="ok" dot>Escrito</Pill>}
                  {incomplete && <Pill variant="warn" dot>Falta traducir</Pill>}
                </span>
                <span className="mt-1 block text-[13px] leading-[1.5] text-[color:var(--color-muted)]">{item.description}</span>
                {page?.lastUpdated && (
                  <span className="mt-1 block text-[12.5px] text-[color:var(--color-muted)]">Última revisión: {formatDate(`${page.lastUpdated}T12:00:00`)}</span>
                )}
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--color-muted)]" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
