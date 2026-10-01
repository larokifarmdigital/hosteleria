import Link from 'next/link';
import { Plus, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { formatDate } from '@/lib/utils';
import { getApi } from '@/lib/api';
import type { Restaurant } from '@hosteleria/api-client';

const ALL_LOCALES = ['es', 'ca', 'en'];

const STATE_LABEL = { published: 'Publicado', draft: 'Borrador', warnings: 'Con avisos', new: 'Nuevo' } as const;
const STATE_VARIANT = { published: 'ok', draft: 'warn', warnings: 'warn', new: 'plain' } as const;

export const dynamic = 'force-dynamic';

export default async function RestaurantsPage() {
  const api = await getApi();
  let RESTAURANTS: Restaurant[] = [];
  try {
    RESTAURANTS = await api.restaurants.list();
  } catch (err) {
    console.warn('[restaurants] api failed:', err);
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">Restaurantes</h1>
          <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">6 landings activas · un dominio por local.</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Añadir restaurante
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              {['Restaurante', 'Dominio', 'Idiomas', 'Espacios', 'Carta', 'Estado', 'Actualizado', ''].map(h => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESTAURANTS.map(r => (
              <tr key={r.id} className="cursor-pointer transition-colors hover:bg-[color:var(--color-surface-2)]">
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 align-middle">
                  <Link href={`/restaurants/${r.slug}`} className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 flex-shrink-0 rounded-md"
                      style={{ background: r.coverGradient }}
                    />
                    <div>
                      <strong className="block font-semibold text-[color:var(--color-ink)]">{r.name}</strong>
                      <span className="slug">{r.slug}</span>
                    </div>
                  </Link>
                </td>
                <td className="slug border-b border-[color:var(--color-border)] px-5 py-3 align-middle">{r.domain}</td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 align-middle">
                  <LocaleChips codes={ALL_LOCALES} active={r.activeLocales} />
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 align-middle text-[color:var(--color-ink-soft)]">
                  {r.spacesCount}
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 align-middle text-[color:var(--color-ink-soft)]">
                  {r.dishesCount} platos · {r.winesCount} vinos
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 align-middle">
                  <Pill variant={STATE_VARIANT[r.state]} dot>
                    {STATE_LABEL[r.state]}
                  </Pill>
                </td>
                <td className="slug border-b border-[color:var(--color-border)] px-5 py-3 align-middle">
                  {r.lastPublishedAt ? formatDate(r.lastPublishedAt) : '—'}
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 align-middle">
                  <Link
                    href={`/restaurants/${r.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[color:var(--color-muted)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
                  >
                    Editar
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
