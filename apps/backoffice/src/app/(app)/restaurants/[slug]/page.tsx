import { notFound } from 'next/navigation';
import { Eye, Check } from 'lucide-react';
import { getApi } from '@/lib/api';
import { ApiError } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { Callout } from '@/components/shared/Callout';
import { FichaTabs } from '@/components/restaurant/FichaTabs';
import { LangList } from '@/components/restaurant/LangList';
import { SpaceCard, AddSpaceCard } from '@/components/restaurant/SpaceCard';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { formatDate } from '@/lib/utils';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function RestaurantHubPage({ params }: Props) {
  const { slug } = await params;
  const api = await getApi();

  let restaurant;
  let spaces;
  try {
    [restaurant, spaces] = await Promise.all([
      api.restaurants.get(slug),
      api.spaces.list(slug)
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }
  if (!restaurant) notFound();

  return (
    <>
      {/* Editor header */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3.5">
          <div
            className="grid h-12 w-12 place-items-center rounded-[14px] text-[17px] font-bold text-white"
            style={{
              background: 'var(--gradient-copper)',
              boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.26), 0 2px 6px rgb(74 36 22 / 0.24)'
            }}
          >
            {restaurant.logoInitial}
          </div>
          <div className="flex flex-col">
            <h1 className="m-0 text-[18px] font-bold tracking-[-0.01em]">{restaurant.name}</h1>
            <span className="slug tabular mt-0.5 text-[12px]">{restaurant.slug} · {restaurant.domain}</span>
          </div>
          <Pill variant={restaurant.state === 'published' ? 'ok' : 'warn'} dot className="ml-2">
            {restaurant.state === 'published' ? 'Publicado' : 'Borrador'}
          </Pill>
        </div>

        <div className="ml-auto flex gap-2.5">
          <Button variant="ghost">
            <Eye className="h-4 w-4" />
            Ver live
          </Button>
          <Button variant="primary">
            <Check className="h-4 w-4" />
            Publicar todo
          </Button>
        </div>
      </div>

      {/* Grid principal: contenido + aside */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2">
          {/* Bloque Ficha */}
          <section className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-3.5 border-b border-[color:var(--color-border)] px-6 py-5">
              <div>
                <h3 className="m-0 flex items-center gap-1.5 text-[14.5px] font-bold tracking-[-0.005em]">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="var(--color-accent)" strokeWidth={1.6} className="-mb-0.5">
                    <path d="M4 5h12M4 10h12M4 15h8" />
                  </svg>
                  Ficha del restaurante
                </h3>
                <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
                  Datos compartidos por todos los espacios · aplica a toda la landing.
                </p>
              </div>
              <Pill>6 secciones</Pill>
            </div>

            <FichaTabs />

            <div className="p-6 pt-5">
              <LocaleTabs locales={['es', 'ca', 'en']} defaultLocale={restaurant.defaultLocale} />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Nombre" required defaultValue={restaurant.name} />
                <Field label="Slug (URL)" defaultValue={restaurant.slug} mono />
              </div>
              <div className="mt-5">
                <Field
                  label="Descriptor corto (meta y nav)"
                  defaultValue="Cocina de mercado, coctelería de autor · Plaça Reial"
                />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Dirección" defaultValue={restaurant.address.street ?? ''} />
                <Field label="Ciudad" defaultValue={restaurant.address.city ?? ''} />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Código postal" defaultValue={restaurant.address.postalCode ?? ''} />
                <Field label="Barrio (SEO local)" defaultValue={restaurant.address.district ?? ''} />
              </div>
            </div>
          </section>

          {/* Espacios */}
          <div className="mb-3.5 mt-6 flex items-baseline justify-between px-0.5">
            <h2 className="m-0 flex items-center gap-1.5 text-[15px] font-bold tracking-[-0.005em]">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="var(--color-accent)" strokeWidth={1.6} className="-mb-0.5">
                <path d="M3 8l7-5 7 5v9H3z" strokeLinejoin="round" />
                <path d="M8 17v-5h4v5" />
              </svg>
              Espacios de {restaurant.name}
              <span className="text-[13px] font-medium text-[color:var(--color-muted)]">({spaces.length})</span>
            </h2>
            <span className="text-[12.5px] text-[color:var(--color-muted)]">
              Cada espacio tiene su propio hero, horarios, galería y cartas.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {spaces.map(s => (
              <SpaceCard key={s.id} space={s} restaurantSlug={restaurant.slug} />
            ))}
            <AddSpaceCard />
          </div>
        </div>

        {/* Aside */}
        <aside className="sticky top-20 flex flex-col gap-5 self-start">
          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h4 className="m-0 mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
              Estado
            </h4>
            <AsideRow k="Última publicación" v={restaurant.lastPublishedAt ? formatDate(restaurant.lastPublishedAt) : '—'} />
            <AsideRow k="Ficha completa" v={`${restaurant.completePercent}%`} />
            <AsideRow k="Dataset" v="production" mono />
            <AsideRow k="Dominio" v={restaurant.domain} mono />
          </div>

          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h4 className="m-0 mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
              Idiomas del restaurante
            </h4>
            <p className="m-0 mb-3 text-[12px] leading-[1.55] text-[color:var(--color-muted)]">
              Los idiomas activos se heredan en <em>todos</em> los espacios y en la Ficha. Marca uno como <em>por defecto</em>.
            </p>
            <LangList restaurant={restaurant} />
          </div>

          <Callout title="¿Qué se edita aquí?">
            Solo lo que aplica a toda la landing: identidad, contacto, redes, textos UI, SEO e IA. El contenido de cada
            sala (hero, horarios, fotos, cartas) se edita entrando a su espacio.
          </Callout>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  required,
  defaultValue,
  mono
}: {
  label: string;
  required?: boolean;
  defaultValue: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-semibold text-[color:var(--color-ink)]">
        {label} {required && <span className="text-[color:var(--color-danger)]">*</span>}
      </span>
      <input
        defaultValue={defaultValue}
        className={`w-full rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] leading-[1.4] text-[color:var(--color-ink)] transition-colors focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)] ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}

function AsideRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-[color:var(--color-border)] py-2 text-[13px] text-[color:var(--color-ink-soft)] first:border-t-0">
      <span className="text-[color:var(--color-muted)]">{k}</span>
      <span className={`font-semibold text-[color:var(--color-ink)] ${mono ? 'tabular text-[12px]' : ''}`}>{v}</span>
    </div>
  );
}
