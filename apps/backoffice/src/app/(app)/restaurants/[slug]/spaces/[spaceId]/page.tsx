import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight, Eye, Check } from 'lucide-react';
import { getApi } from '@/lib/api';
import { ApiError } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { Callout } from '@/components/shared/Callout';
import { SectionNav } from '@/components/space/SectionNav';
import { LocaleTabs } from '@/components/space/LocaleTabs';

interface Props {
  params: Promise<{ slug: string; spaceId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SpaceEditorPage({ params }: Props) {
  const { slug, spaceId } = await params;
  const api = await getApi();

  let restaurant, space, allSpaces;
  try {
    [restaurant, space, allSpaces] = await Promise.all([
      api.restaurants.get(slug),
      api.spaces.get(slug, spaceId),
      api.spaces.list(slug)
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }
  if (!restaurant || !space) notFound();

  const siblingSpaces = allSpaces.filter(s => s.id !== space.id);

  return (
    <>
      {/* Editor header */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3.5">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            aria-label={`Volver a ${restaurant.name}`}
            className="grid h-8 w-8 place-items-center rounded-[10px] border border-[color:var(--color-border)] text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div
            className="grid h-12 w-12 place-items-center rounded-[14px] text-[17px] font-bold text-white"
            style={{
              background: 'var(--gradient-copper)',
              boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.26), 0 2px 6px rgb(74 36 22 / 0.24)'
            }}
          >
            {space.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <div className="mb-0.5 flex items-center gap-2 text-[11.5px] font-medium text-[color:var(--color-muted)]">
              <Link href={`/restaurants/${restaurant.slug}`} className="text-[color:var(--color-muted)] hover:underline">
                {restaurant.name}
              </Link>
              <span className="text-[color:var(--color-dim)]">/</span>
              <span>Espacio</span>
            </div>
            <h1 className="m-0 text-[18px] font-bold tracking-[-0.01em]">{space.name}</h1>
            <span className="slug tabular mt-0.5 text-[12px]">{space.descriptor}</span>
          </div>
          <Pill variant={space.state === 'published' ? 'ok' : 'warn'} dot className="ml-2">
            {space.state === 'published' ? 'Publicado' : 'Borrador'}
          </Pill>
          {space.isDefault && (
            <Pill variant="accent" className="text-[10.5px]">Por defecto</Pill>
          )}
        </div>

        <div className="ml-auto flex gap-2.5">
          <Button variant="ghost">
            <Eye className="h-4 w-4" />
            Ver live del espacio
          </Button>
          <Button variant="secondary">Renombrar</Button>
          <Button variant="secondary">Duplicar</Button>
          <Button variant="primary">
            <Check className="h-4 w-4" />
            Publicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)_300px]">
        <SectionNav />

        {/* Form Hero */}
        <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-7 shadow-[var(--shadow-sm)] md:p-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16px] font-bold tracking-[-0.005em]">Hero</h2>
              <p className="m-0 mt-1 text-[12.5px] text-[color:var(--color-muted)]">
                Bloque principal del inicio · titular, subtítulo, imagen y CTA.
              </p>
            </div>
            <Pill>3 campos · 3 idiomas</Pill>
          </div>

          <LocaleTabs locales={restaurant.activeLocales} defaultLocale={restaurant.defaultLocale} />

          <div className="mb-6">
            <FieldLabel required>Título del hero</FieldLabel>
            <FieldHint>Línea principal, grande. Bodoni Moda display en la web. Máx. 42 caracteres.</FieldHint>
            <FieldInput defaultValue={space.hero.title?.es ?? ''} />
          </div>

          <div className="mb-6">
            <FieldLabel required>Subtítulo</FieldLabel>
            <FieldHint>Aparece debajo del título, remata la frase.</FieldHint>
            <FieldInput defaultValue={space.hero.subtitle?.es ?? ''} />
          </div>

          <div className="mb-6">
            <FieldLabel>Nota / párrafo</FieldLabel>
            <FieldHint>Texto corto bajo el título. Máx. 240 caracteres.</FieldHint>
            <textarea
              defaultValue={space.hero.note?.es ?? ''}
              rows={3}
              className="min-h-[110px] w-full resize-y rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] leading-[1.55] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]"
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Meta izquierda</FieldLabel>
              <FieldInput defaultValue={space.hero.metaLeft?.es ?? ''} />
            </div>
            <div>
              <FieldLabel>Meta derecha</FieldLabel>
              <FieldInput defaultValue={space.hero.metaRight?.es ?? ''} />
            </div>
          </div>

          <div className="mb-6">
            <FieldLabel required>Imagen principal</FieldLabel>
            <div className="flex items-center gap-3.5 rounded-[10px] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] p-3">
              <div
                className="h-[72px] w-[72px] flex-shrink-0 rounded-md"
                style={{ background: space.coverGradient }}
              />
              <div className="min-w-0 flex-1">
                <strong className="block text-[13px] font-semibold text-[color:var(--color-ink)]">
                  {space.slug}-hero.jpg
                </strong>
                <span className="slug mt-1 block text-[11.5px]">
                  2400 × 3000 · WebP · alt: “{space.hero.imageAlt?.es ?? 'Sin alt'}”
                </span>
              </div>
              <Button variant="secondary" size="sm">Reemplazar</Button>
              <Button variant="ghost" size="sm">Editar alt</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Texto del CTA</FieldLabel>
              <FieldInput defaultValue={space.hero.cta?.es ?? ''} />
            </div>
            <div>
              <FieldLabel>Acción del CTA</FieldLabel>
              <select className="w-full appearance-none rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none">
                <option>Ir al formulario de reserva</option>
                <option>Abrir WhatsApp</option>
                <option>Enlace externo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Aside */}
        <aside className="sticky top-20 flex flex-col gap-5 self-start">
          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h4 className="m-0 mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
              Publicación
            </h4>
            <AsideRow k="Estado" v={<Pill variant="ok" dot>Publicado</Pill>} />
            <AsideRow k="Última" v="hace 4 h" />
            <AsideRow k="Completo" v={`${space.completePercent}%`} />
            <AsideRow k="Rol" v={space.isDefault ? <Pill variant="accent" className="text-[10px]">Por defecto</Pill> : <span className="slug">secundario</span>} />
          </div>

          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h4 className="m-0 mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
              Cambiar de espacio
            </h4>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 rounded-lg bg-[color:var(--color-accent-soft)] p-2.5 px-3">
                <div className="flex flex-1 flex-col leading-tight">
                  <strong className="text-[13px] font-semibold text-[color:var(--color-accent)]">{space.name}</strong>
                  <span className="text-[11.5px] text-[color:var(--color-muted)]">en edición</span>
                </div>
              </div>
              {siblingSpaces.map(s => (
                <Link
                  key={s.id}
                  href={`/restaurants/${restaurant.slug}/spaces/${s.id}`}
                  className="flex items-center gap-2.5 rounded-lg border border-[color:var(--color-border)] bg-white p-2.5 px-3 transition-colors hover:border-[color:var(--color-copper-300)]"
                >
                  <div className="flex flex-1 flex-col leading-tight">
                    <strong className="text-[13px] font-semibold text-[color:var(--color-ink)]">{s.name}</strong>
                    <span className="text-[11.5px] text-[color:var(--color-muted)]">
                      {s.state === 'draft' ? `borrador · ${s.completePercent}%` : s.descriptor}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[color:var(--color-dim)]" />
                </Link>
              ))}
            </div>
            <Link
              href={`/restaurants/${restaurant.slug}`}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)]"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver a la ficha de {restaurant.name}
            </Link>
          </div>

          <Callout title="Estás editando un espacio">
            Los cambios afectan solo a <em>{space.name}</em>. Identidad, contacto, redes y SEO se editan en la ficha del
            restaurante.
          </Callout>
        </aside>
      </div>
    </>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[color:var(--color-ink)]">
      {children} {required && <span className="text-[color:var(--color-danger)]">*</span>}
    </label>
  );
}
function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="m-0 mb-2.5 text-[12.5px] leading-[1.55] text-[color:var(--color-muted)]">{children}</p>;
}
function FieldInput({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      defaultValue={defaultValue}
      className="w-full rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] leading-[1.4] text-[color:var(--color-ink)] transition-colors focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]"
    />
  );
}
function AsideRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-[color:var(--color-border)] py-2 text-[13px] text-[color:var(--color-ink-soft)] first:border-t-0">
      <span className="text-[color:var(--color-muted)]">{k}</span>
      <span className="font-semibold text-[color:var(--color-ink)]">{v}</span>
    </div>
  );
}
