'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Restaurant } from '@hosteleria/api-client';
import { Section } from '@/components/shared/Section';
import { PendingTaskList } from '@/components/tasks/PendingTaskList';
import { usePendingTasks } from '@/lib/query/hooks';
import { useChangeCount } from '@/lib/useChangeCount';

interface Props {
  restaurant: Restaurant;
  localeNames: Record<string, string>;
  /** Abre otro apartado de la ficha. */
  onGo: (tab: 'spaces' | 'data' | 'languages') => void;
}

const CARD =
  'flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white px-4 py-3 text-left shadow-[var(--shadow-sm)] transition-colors hover:border-[color:var(--color-copper-300)]';

function CardText({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-[14.5px] font-bold tracking-[-0.005em] text-[color:var(--color-ink)]">{title}</span>
      <span className="mt-0.5 block text-[13px] leading-[1.45] text-[color:var(--color-muted)]">{detail}</span>
    </span>
  );
}

/** La entrada al restaurante: qué falta por hacer y por dónde se llega a cada cosa. */
export function OverviewPanel({ restaurant, localeNames, onGo }: Props) {
  const { data, isPending } = usePendingTasks(restaurant.slug, useChangeCount(restaurant));
  // Que la ficha está sin publicar ya lo dice el panel «Publicación», aquí al lado: no se repite.
  const tasks = data?.filter(task => !(task.type === 'unpublished' && task.target.kind === 'restaurant'));
  const spaces = restaurant.spacesCount;
  const menu = [
    `${restaurant.dishesCount} ${restaurant.dishesCount === 1 ? 'plato' : 'platos'}`,
    `${restaurant.winesCount} ${restaurant.winesCount === 1 ? 'vino' : 'vinos'}`,
    ...(restaurant.drinksCount > 0 ? [`${restaurant.drinksCount} bebidas`] : [])
  ].join(' · ');
  const chevron = <ChevronRight aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--color-muted)]" />;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Pendiente" description="Lo que falta para que la web esté completa. Cada aviso lleva al sitio donde se arregla.">
        {isPending ? (
          <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-muted)]">Comprobando el contenido…</p>
        ) : tasks && tasks.length > 0 ? (
          <PendingTaskList slug={restaurant.slug} tasks={tasks} localeNames={localeNames} />
        ) : (
          <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-ink-soft)]">Todo al día: no falta nada por publicar, traducir ni completar.</p>
        )}
      </Section>

      <section aria-labelledby="atajos-titulo">
        <h2 id="atajos-titulo" className="m-0 mb-3 text-[15px] font-bold tracking-[-0.005em]">Qué quieres editar</h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          <li>
            <button type="button" className={CARD} onClick={() => onGo('spaces')}>
              <CardText title="Espacios" detail={spaces === 0 ? 'Aún no hay ninguno: añade el primero.' : `${spaces === 1 ? '1 espacio' : `${spaces} espacios`}: portada, fotos y horarios de cada uno.`} />
              {chevron}
            </button>
          </li>
          <li>
            <Link href={`/dishes?r=${restaurant.slug}`} className={CARD}>
              <CardText title="Carta" detail={menu} />
              {chevron}
            </Link>
          </li>
          <li>
            <button type="button" className={CARD} onClick={() => onGo('data')}>
              <CardText title="Datos y contacto" detail="Nombre, dirección, teléfono, redes y reservas." />
              {chevron}
            </button>
          </li>
          <li>
            <Link href={`/media?r=${restaurant.slug}`} className={CARD}>
              <CardText title="Imágenes" detail="Las fotos del restaurante y sus descripciones." />
              {chevron}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
