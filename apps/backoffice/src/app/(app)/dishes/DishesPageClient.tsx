'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pill } from '@/components/shared/Pill';
import { Table, Td } from '@/components/shared/Table';
import { useDishes } from '@/lib/query/hooks';

const COLUMNS = [
  { label: 'Plato' },
  { label: 'Restaurante' },
  { label: 'Categoría' },
  { label: 'Idiomas' },
  { label: 'Precio' },
  { label: 'Estado' }
];

const price = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function DishesPageClient() {
  const dishesQuery = useDishes();
  const dishes = dishesQuery.data ?? [];

  return (
    <>
      <PageHeader title="Carta">Los platos de todos tus restaurantes.</PageHeader>

      <QueryBoundary queries={[dishesQuery]}>
      {dishes.length === 0 ? (
        <EmptyState title="Todavía no hay platos en la carta" />
      ) : (
        <Table caption="Platos" columns={COLUMNS}>
          {dishes.map(d => (
            <tr key={d.id}>
              <Td>
                <strong className="font-semibold text-[color:var(--color-ink)]">
                  {d.name.es ?? Object.values(d.name)[0] ?? 'Sin nombre'}
                </strong>
              </Td>
              <Td className="text-[color:var(--color-ink-soft)]">{d.restaurantName}</Td>
              <Td><Pill>{d.categoryName}</Pill></Td>
              <Td><LocaleChips codes={d.localesFilled} /></Td>
              <Td className="tabular whitespace-nowrap font-semibold text-[color:var(--color-ink)]">
                {d.price !== null ? price.format(d.price) : <span className="font-normal text-[color:var(--color-muted)]">Sin precio</span>}
              </Td>
              <Td>{d.active ? <Pill variant="ok" dot>Visible</Pill> : <Pill dot>Oculto</Pill>}</Td>
            </tr>
          ))}
        </Table>
      )}
      </QueryBoundary>
    </>
  );
}
