import { Upload, Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { getApi } from '@/lib/api';
import type { MediaAsset } from '@hosteleria/api-client';

const FILTER_GROUPS = [
  {
    title: 'Restaurante',
    options: [
      { label: 'Todos', count: 312 },
      { label: 'Casabella', count: 84 },
      { label: 'Guixot', count: 72 },
      { label: 'La Principal', count: 61 },
      { label: 'Roure', count: 42 },
      { label: 'Pubilla', count: 28 },
      { label: 'Ocaña', count: 25 }
    ]
  },
  {
    title: 'Uso',
    options: [
      { label: 'Hero', count: 18 },
      { label: 'Galería', count: 124 },
      { label: 'Platos', count: 98 },
      { label: 'Sin usar', count: 14 }
    ]
  },
  {
    title: 'Estado',
    options: [
      { label: 'Sin alt text', count: 8, warn: true },
      { label: '> 1 MB', count: 3 }
    ]
  }
];

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const api = await getApi();
  let MEDIA: MediaAsset[] = [];
  try {
    MEDIA = await api.media.list();
  } catch (err) {
    console.warn('[media] api failed:', err);
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">Media library</h1>
          <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
            312 archivos · 1.2 GB · CDN Cloudflare R2
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary">
            <Upload className="h-4 w-4" />
            Subir imágenes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="sticky top-20 self-start rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-4 shadow-[var(--shadow-sm)]">
          {FILTER_GROUPS.map(group => (
            <div key={group.title} className="mb-4 last:mb-0">
              <h4 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                {group.title}
              </h4>
              {group.options.map(opt => (
                <label
                  key={opt.label}
                  className="flex cursor-pointer items-center justify-between py-1 text-[13px] text-[color:var(--color-ink-soft)]"
                >
                  <span>{opt.label}</span>
                  <span
                    className="tabular text-[11.5px]"
                    style={{ color: (opt as { warn?: boolean }).warn ? 'var(--color-warn)' : 'var(--color-dim)' }}
                  >
                    {opt.count}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </aside>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
          <button
            type="button"
            className="grid aspect-square cursor-pointer place-items-center rounded-[var(--radius)] border-2 border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] p-3 text-center text-[12.5px] font-semibold text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
          >
            <div>
              <Plus className="mx-auto mb-1.5 h-7 w-7" strokeWidth={1.4} />
              <div>Arrastra o clica</div>
            </div>
          </button>

          {MEDIA.map(m => (
            <div
              key={m.id}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] transition-all hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[var(--shadow-md)]"
              style={{
                backgroundImage: `url(${m.publicUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: 'var(--color-copper-200)'
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2.5 text-[11px] font-medium tabular text-[#f5efdc]"
                style={{ background: 'linear-gradient(to top, rgba(23,27,36,0.85), transparent)' }}
              >
                <span>{m.name}</span>
                <span>{m.sizeKb} KB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
