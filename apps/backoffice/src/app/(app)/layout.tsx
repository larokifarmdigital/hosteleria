import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { AppHeader } from '@/components/layout/AppHeader';
import { requireUser } from '@/lib/auth/guards';
import { getServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/server';
import { prefetchRestaurants } from '@/lib/query/prefetch';
import { qk } from '@/lib/query/keys';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Sesión y restaurantes van hidratados: la cabecera depende del rol y de
  // cuántos restaurantes tiene el usuario, y no debe parpadear al cargar.
  const qc = getQueryClient();
  qc.setQueryData(qk.auth.session(), user);
  await prefetchRestaurants(qc, await getServerApi());

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[10px] focus:bg-white focus:px-4 focus:py-3 focus:text-[14px] focus:font-semibold focus:text-[color:var(--color-accent)] focus:shadow-[var(--shadow-md)]"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none md:p-6 lg:p-8">
          <div className="mx-auto max-w-[1240px]">{children}</div>
        </main>
      </div>
    </HydrationBoundary>
  );
}
