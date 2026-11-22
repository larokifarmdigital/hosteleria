import Link from 'next/link';
import type { Restaurant } from '@/lib/types';
import { StatePill } from '@/components/shared/StatePill';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { formatDate } from '@/lib/utils';

interface Props {
  restaurant: Restaurant;
  href: string;
}

export function RestaurantCard({ restaurant, href }: Props) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-copper-300)] hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        aria-hidden
        className="h-[76px] border-b border-[color:var(--color-border)]"
        style={{ background: restaurant.coverGradient }}
      />

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <strong className="block text-[15px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">
              {restaurant.name}
            </strong>
            <span className="slug mt-0.5 block truncate">{restaurant.domain}</span>
          </div>
          <StatePill state={restaurant.state} />
        </div>

        <p className="m-0 text-[12.5px] text-[color:var(--color-muted)]">
          {restaurant.spacesCount} {restaurant.spacesCount === 1 ? 'espacio' : 'espacios'} · {restaurant.dishesCount} platos ·{' '}
          {restaurant.winesCount} vinos{restaurant.drinksCount > 0 ? ` · ${restaurant.drinksCount} bebidas` : ''}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[color:var(--color-border)] pt-2.5">
          <LocaleChips codes={restaurant.activeLocales} />
          <span className="slug">
            {restaurant.lastPublishedAt ? `Publicado el ${formatDate(restaurant.lastPublishedAt)}` : 'Sin publicar'}
          </span>
        </div>
      </div>
    </Link>
  );
}
