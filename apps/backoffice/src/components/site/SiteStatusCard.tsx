'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import type { Restaurant } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Section } from '@/components/shared/Section';
import { showSuccessToast } from '@/lib/api';
import { useRebuildSite, useSiteStatus } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { siteStatusText } from './siteStatusText';

const DOT = {
  ok: 'bg-[color:var(--color-ok)]',
  busy: 'bg-[color:var(--color-accent)] motion-safe:animate-pulse',
  warn: 'bg-[color:var(--color-warn)]'
} as const;

/** En la ficha: si la web ya enseña lo último publicado, con la opción de actualizarla a mano. */
export function SiteStatusCard({ restaurant }: { restaurant: Restaurant }) {
  const { data: site } = useSiteStatus(restaurant.slug);
  const rebuild = useRebuildSite(restaurant.slug);
  const text = site ? siteStatusText(site) : null;
  if (!site || !text) return null;

  const canRetry = site.canRebuild && (site.state === 'outdated' || site.state === 'unknown');

  return (
    <Section title="Web">
      <div role="status" className="flex items-start gap-2.5">
        <span aria-hidden className={cn('mt-[7px] h-2 w-2 flex-shrink-0 rounded-full', DOT[text.tone])} />
        <p className="m-0 min-w-0">
          <span className="block text-[13.5px] font-semibold leading-[1.4] text-[color:var(--color-ink)]">{text.title}</span>
          {text.detail && <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">{text.detail}</span>}
        </p>
      </div>
      {(canRetry || site.siteUrl) && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {canRetry && (
            <Button
              size="sm"
              disabled={rebuild.isPending}
              onClick={() => rebuild.mutateAsync().then(() => showSuccessToast('Actualización pedida', 'La web tardará uno o dos minutos.'), () => {})}
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              {rebuild.isPending ? 'Pidiendo…' : 'Actualizar la web ahora'}
            </Button>
          )}
          {site.siteUrl && (
            <a
              href={site.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-[13.5px] font-semibold text-[color:var(--color-accent)] underline underline-offset-2"
            >
              Abrir la web
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
          )}
        </div>
      )}
    </Section>
  );
}
