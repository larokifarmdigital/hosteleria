import Link from 'next/link';
import type { Space } from '@/lib/types';
import { Pill } from '@/components/shared/Pill';
import { StatePill } from '@/components/shared/StatePill';

interface Props {
  space: Space;
  restaurantSlug: string;
}

export function SpaceCard({ space, restaurantSlug }: Props) {
  return (
    <Link
      href={`/restaurants/${restaurantSlug}/spaces/${space.id}`}
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-copper-300)] hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        aria-hidden
        className="h-[76px] border-b border-[color:var(--color-border)]"
        style={{ background: space.coverGradient }}
      />

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <strong className="block text-[15px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">
              {space.name}
            </strong>
            {space.descriptor && <span className="slug mt-0.5 block">{space.descriptor}</span>}
          </div>
          <StatePill state={space.state} />
        </div>
        {space.isDefault && (
          <div className="mt-auto">
            <Pill variant="accent">Espacio principal</Pill>
          </div>
        )}
      </div>
    </Link>
  );
}
