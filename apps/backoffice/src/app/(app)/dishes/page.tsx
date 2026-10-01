import { Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { SubTabs } from '@/components/dishes/SubTabs';
import { ToggleActive } from '@/components/dishes/ToggleActive';
import { getApi } from '@/lib/api';
import type { Dish } from '@hosteleria/api-client';

const ALL_LOCALES = ['es', 'ca', 'en'];

export const dynamic = 'force-dynamic';

export default async function DishesPage() {
  const api = await getApi();
  let DISHES: Dish[] = [];
  try {
    DISHES = await api.dishes.list();
  } catch (err) {
    console.warn('[dishes] api failed:', err);
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">Carta</h1>
          <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
            Platos, vinos y categorías. Filtra por restaurante.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary">
            <Plus className="h-4 w-4" />
            Añadir categoría
          </Button>
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Añadir plato
          </Button>
        </div>
      </div>

      <SubTabs
        tabs={[
          { id: 'dishes', label: 'Platos', count: 148 },
          { id: 'wines', label: 'Vinos', count: 70 },
          { id: 'categories', label: 'Categorías', count: 24 }
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <FilterSelect defaultValue="Todos los restaurantes" options={['Todos los restaurantes', 'Casabella', 'Guixot', 'La Principal']} />
        <FilterSelect defaultValue="Todas las categorías" options={['Todas las categorías', 'Entrantes', 'Guisos', 'Arroces', 'Postres']} />
        <FilterSelect defaultValue="Todos los idiomas" options={['Todos los idiomas', 'Falta CA', 'Falta EN']} />
        <span className="ml-auto text-[12.5px] text-[color:var(--color-muted)]">{DISHES.length} resultados</span>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              {['', 'Plato', 'Restaurante', 'Categoría', 'Idiomas', 'Precio', 'Activo', ''].map(h => (
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
            {DISHES.map(d => (
              <tr key={d.id} className="transition-colors hover:bg-[color:var(--color-surface-2)]">
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <div className="h-10 w-10 rounded-md" style={{ background: d.imageGradient }} />
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <strong className="block font-semibold text-[color:var(--color-ink)]">{d.name.es}</strong>
                  <span className="slug tabular">/carta/{d.name.es?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</span>
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3 text-[color:var(--color-ink-soft)]">
                  {d.restaurantName}
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <Pill>{d.categoryName}</Pill>
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <LocaleChips codes={ALL_LOCALES} active={d.localesFilled} />
                </td>
                <td className="tabular border-b border-[color:var(--color-border)] px-5 py-3 font-semibold text-[color:var(--color-ink)]">
                  {d.price ? `${d.price.toFixed(2).replace('.', ',')} €` : '—'}
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <ToggleActive defaultActive={d.active} />
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <Button variant="ghost" size="sm">Editar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterSelect({ defaultValue, options }: { defaultValue: string; options: string[] }) {
  return (
    <select
      defaultValue={defaultValue}
      className="cursor-pointer appearance-none rounded-[10px] border border-[color:var(--color-border)] bg-white bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%226%22%20viewBox=%220%200%2010%206%22%3E%3Cpath%20d=%22M1%201l4%204%204-4%22%20stroke=%22%236e7180%22%20stroke-width=%221.5%22%20fill=%22none%22%20stroke-linecap=%22round%22/%3E%3C/svg%3E')] bg-[position:right_10px_center] bg-no-repeat py-1.5 pl-3 pr-7 text-[13px] font-medium text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none"
    >
      {options.map(o => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
