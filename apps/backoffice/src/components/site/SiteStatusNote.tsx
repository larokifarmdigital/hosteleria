'use client';

import { useSiteStatus } from '@/lib/query/hooks';
import { siteStatusText } from './siteStatusText';

/**
 * Una línea para las pantallas sin botón de publicar (la carta): avisa mientras la
 * web aún no enseña lo que se acaba de guardar. Si está al día, no dice nada.
 */
export function SiteStatusNote({ restaurantSlug }: { restaurantSlug: string }) {
  const { data: site } = useSiteStatus(restaurantSlug);
  const text = site && (site.state === 'updating' || site.state === 'outdated') ? siteStatusText(site) : null;
  return (
    <p role="status" className={text ? 'm-0 mb-5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3.5 py-2.5 text-[13.5px] leading-[1.5] text-[color:var(--color-ink)]' : 'sr-only'}>
      {text && (
        <>
          <strong className="font-semibold">{text.title}.</strong>{' '}
          {text.detail}
        </>
      )}
    </p>
  );
}
