import Link from 'next/link';
import type { Restaurant } from '@/lib/types';
import { Pill } from '@/components/shared/Pill';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { formatDate } from '@/lib/utils';

const ALL_LOCALES = ['es', 'ca', 'en'];

const STATE_LABEL: Record<Restaurant['state'], string> = {
  published: 'Publicado',
  draft: 'Borrador',
  warnings: 'Con avisos',
  new: 'Nuevo'
};
const STATE_VARIANT: Record<Restaurant['state'], 'ok' | 'warn' | 'plain'> = {
  published: 'ok',
  draft: 'warn',
  warnings: 'warn',
  new: 'plain'
};

interface Props {
  restaurant: Restaurant;
  href: string;
}

export function RestaurantCard({ restaurant, href }: Props) {
  const barColor = restaurant.state === 'published' ? 'var(--color-ok)' : 'var(--color-warn)';

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-copper-300)] hover:shadow-[var(--shadow-lg)]"
    >
      <div
        className="relative h-[76px] border-b border-[color:var(--color-border)]"
        style={{ background: restaurant.coverGradient }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgb(0 0 0 / 0.14), transparent 60%)' }}
        />
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <strong className="block text-[15px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">
              {restaurant.name}
            </strong>
            <span className="slug mt-0.5 block text-[11.5px]">{restaurant.domain}</span>
          </div>
          <Pill variant={STATE_VARIANT[restaurant.state]} dot>
            {STATE_LABEL[restaurant.state]}
          </Pill>
        </div>

        <div
          className="h-1 overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]"
          title={`Contenido ${restaurant.completePercent}% completo`}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${restaurant.completePercent}%`, background: barColor }}
          />
        </div>

        <div className="flex flex-wrap gap-3 text-[12px] text-[color:var(--color-muted)]">
          <span>
            <b className="tabular font-bold text-[color:var(--color-ink)]">{restaurant.completePercent}%</b> completo
          </span>
          <span>{restaurant.spacesCount} espacio{restaurant.spacesCount === 1 ? '' : 's'}</span>
          <span>{restaurant.dishesCount + restaurant.winesCount} en carta</span>
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-2">
          <LocaleChips codes={ALL_LOCALES} active={restaurant.activeLocales} />
          <span className="slug text-[11.5px]">
            {restaurant.state === 'published' && restaurant.lastPublishedAt
              ? `Publicado ${formatDate(restaurant.lastPublishedAt).slice(0, 5)}`
              : 'Sin publicar'}
          </span>
        </div>
      </div>
    </Link>
  );
}
