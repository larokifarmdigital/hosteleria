import Link from 'next/link';
import type { Restaurant } from '@/lib/types';
import { StatePill } from '@/components/shared/StatePill';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { formatDate } from '@/lib/utils';

interface Props {
  restaurant: Restaurant;
  href: string;
  /** Nº de cosas por resolver; `undefined` mientras se comprueba. */
  pending?: number;
}

export function RestaurantCard({ restaurant, href, pending }: Props) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-4 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-copper-300)] hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[12px] text-[16px] font-bold text-white"
          style={{ background: 'var(--gradient-copper)' }}
        >
          {restaurant.logoInitial}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-[15.5px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">
            {restaurant.name}
          </strong>
          <span className="slug mt-0.5 block truncate">{restaurant.domain}</span>
        </div>
        <StatePill state={restaurant.state} />
      </div>

      <p className="m-0 text-[13px] text-[color:var(--color-muted)]">
        {restaurant.spacesCount} {restaurant.spacesCount === 1 ? 'espacio' : 'espacios'} · {restaurant.dishesCount} platos ·{' '}
        {restaurant.winesCount} vinos{restaurant.drinksCount > 0 ? ` · ${restaurant.drinksCount} bebidas` : ''}
      </p>

      {!!pending && (
        <p className="m-0 inline-flex items-center gap-2 self-start rounded-full bg-[color:var(--color-warn-soft)] px-2.5 py-1 text-[12.5px] font-semibold text-[color:var(--color-warn-fg)]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {pending === 1 ? '1 cosa pendiente' : `${pending} cosas pendientes`}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[color:var(--color-border)] pt-3">
        <LocaleChips codes={restaurant.activeLocales} />
        <span className="slug">
          {restaurant.lastPublishedAt ? `Publicado el ${formatDate(restaurant.lastPublishedAt)}` : 'Sin publicar'}
        </span>
      </div>
    </Link>
  );
}
