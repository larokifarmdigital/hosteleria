import { Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { KpiTile } from '@/components/dashboard/KpiTile';
import { RestaurantCard } from '@/components/dashboard/RestaurantCard';
import { PendingTasks } from '@/components/dashboard/PendingTasks';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { PENDING_TASKS } from '@/lib/mock-data';
import { getApi } from '@/lib/api';
import type { Restaurant } from '@hosteleria/api-client';

// El dashboard es server-side render — cada visita consulta el api en Neon.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const api = await getApi();

  let restaurants: Restaurant[] = [];
  try {
    restaurants = await api.restaurants.list();
  } catch (err) {
    // Si el api está caído o el user no está autenticado, dejamos array vacío.
    // El middleware de auth redirige a /login en un siguiente paso.
    console.warn('[dashboard] api.restaurants.list failed:', err);
  }

  const published = restaurants.filter(r => r.state === 'published').length;
  const draft = restaurants.length - published;
  const avgComplete = restaurants.length > 0
    ? Math.round(restaurants.reduce((acc, r) => acc + r.completePercent, 0) / restaurants.length)
    : 0;
  const critical = PENDING_TASKS.filter(t => t.severity === 'critical').length;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">Hola, Erick</h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-[color:var(--color-muted)]">
            6 landings · 3 idiomas · producción en Vercel
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary">
            <ImageIcon className="h-4 w-4" />
            Ir a media
          </Button>
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Nuevo restaurante
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        <KpiTile
          label="Restaurantes"
          value={restaurants.length}
          hint={`${published} publicados · ${draft} borrador`}
        />
        <KpiTile
          label="Contenido completo"
          value={<>{avgComplete}<span className="ml-0.5 text-[16px] font-medium text-[color:var(--color-muted)]">%</span></>}
          hint="6 campos por traducir"
          hintTone="warn"
        />
        <KpiTile label="Tareas pendientes" value={PENDING_TASKS.length} hint={`${critical} críticas`} hintTone="warn" />
        <KpiTile label="Media library" value={312} hint="1.2 GB · 8 sin alt text" />
      </div>

      <div className="mb-3.5 mt-2 flex items-baseline justify-between px-0.5">
        <h2 className="m-0 text-[15px] font-bold tracking-[-0.005em]">Tus restaurantes</h2>
        <span className="text-[12.5px] text-[color:var(--color-muted)]">Click en cualquiera para editarlo</span>
      </div>

      {restaurants.length === 0 ? (
        <div className="mb-7 rounded-[var(--radius)] border border-dashed border-[color:var(--color-border-strong)] p-8 text-center text-[color:var(--color-muted)]">
          <p className="m-0 text-[14px]">
            No hay restaurantes visibles.{' '}
            <a href="/login" className="text-[color:var(--color-accent)] font-semibold hover:underline">
              Inicia sesión
            </a>{' '}
            para ver el contenido.
          </p>
        </div>
      ) : (
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map(r => (
            <RestaurantCard key={r.id} restaurant={r} href={`/restaurants/${r.slug}`} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <PendingTasks />
        <SystemStatus />
      </div>
    </>
  );
}
