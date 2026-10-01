import Link from 'next/link';
import type { Space } from '@/lib/types';
import { Pill } from '@/components/shared/Pill';

const STATE_LABEL = { published: 'Publicado', draft: 'Borrador', warnings: 'Con avisos', new: 'Nuevo' } as const;
const STATE_VARIANT = { published: 'ok', draft: 'warn', warnings: 'warn', new: 'plain' } as const;

interface Props {
  space: Space;
  restaurantSlug: string;
}

export function SpaceCard({ space, restaurantSlug }: Props) {
  const barColor = space.state === 'published' ? 'var(--color-ok)' : 'var(--color-warn)';

  return (
    <Link
      href={`/restaurants/${restaurantSlug}/spaces/${space.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-copper-300)] hover:shadow-[var(--shadow-lg)]"
    >
      <div
        className="relative h-[76px] border-b border-[color:var(--color-border)]"
        style={{ background: space.coverGradient }}
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
              {space.name}
            </strong>
            <span className="slug mt-0.5 block text-[11.5px]">{space.descriptor}</span>
          </div>
          <Pill variant={STATE_VARIANT[space.state]} dot>
            {STATE_LABEL[space.state]}
          </Pill>
        </div>

        <div className="h-1 overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
          <div className="h-full rounded-full" style={{ width: `${space.completePercent}%`, background: barColor }} />
        </div>

        <div className="flex flex-wrap gap-3 text-[12px] text-[color:var(--color-muted)]">
          <span>
            <b className="tabular font-bold text-[color:var(--color-ink)]">{space.completePercent}%</b> completo
          </span>
          <span>{space.galleryCount} fotos</span>
          <span>{space.dishesCount} platos</span>
          <span>
            {space.winesCount > 0 ? `${space.winesCount} vinos` : '— sin vinos'}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-2">
          {space.isDefault ? (
            <Pill variant="accent" className="text-[10px]">Por defecto</Pill>
          ) : (
            <span className="slug text-[11.5px]">{space.state === 'draft' ? 'falta hero' : ''}</span>
          )}
          <span className="slug text-[11.5px]">editado hoy</span>
        </div>
      </div>
    </Link>
  );
}

export function AddSpaceCard() {
  return (
    <button
      type="button"
      className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[color:var(--color-border-strong)] bg-transparent p-6 text-center text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
    >
      <div
        className="mb-1 grid h-11 w-11 place-items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-current group-hover:border-[color:var(--color-accent)]"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
      </div>
      <strong className="text-[14.5px] font-bold">Añadir espacio</strong>
      <span className="max-w-[200px] text-[12px] leading-[1.5] text-[color:var(--color-muted)]">
        Nueva sala, terraza, privado, evento…
      </span>
    </button>
  );
}
