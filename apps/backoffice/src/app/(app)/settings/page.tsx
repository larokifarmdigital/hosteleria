import { Plus, Info } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { Callout } from '@/components/shared/Callout';
import { SubTabs } from '@/components/dishes/SubTabs';
import { getApi } from '@/lib/api';
import type { Language, User, Restaurant } from '@hosteleria/api-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const api = await getApi();
  let LANGUAGES: Language[] = [];
  let USERS: User[] = [];
  let RESTAURANTS: Restaurant[] = [];
  try {
    [LANGUAGES, USERS, RESTAURANTS] = await Promise.all([
      api.languages.list(),
      api.users.list().catch(() => []), // usuarios es admin-only, editors devuelven []
      api.restaurants.list()
    ]);
  } catch (err) {
    console.warn('[settings] api failed:', err);
  }
  return (
    <>
      <div className="mb-8">
        <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">Ajustes</h1>
        <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
          Idiomas soportados, usuarios y tokens de API.
        </p>
      </div>

      <SubTabs
        tabs={[
          { id: 'languages', label: 'Idiomas', count: LANGUAGES.filter(l => l.usedByCount > 0).length },
          { id: 'users', label: 'Usuarios', count: USERS.length },
          { id: 'tokens', label: 'Tokens API', count: 4 },
          { id: 'account', label: 'Cuenta', count: 0 }
        ]}
      />

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-5">
            <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.005em]">Idiomas del sistema</h3>
            <Pill>
              {LANGUAGES.filter(l => l.usedByCount > 0).length} activos · {LANGUAGES.filter(l => l.usedByCount === 0).length} disponible
            </Pill>
          </div>
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {['Código ISO', 'Nombre', 'Restaurantes que lo usan', ''].map(h => (
                  <th
                    key={h}
                    className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LANGUAGES.map(l => (
                <tr key={l.id}>
                  <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                    <span className={`text-[13px] font-bold ${l.usedByCount > 0 ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-muted)]'}`}>
                      {l.code}
                    </span>
                  </td>
                  <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                    <strong className="font-semibold text-[color:var(--color-ink)]">{l.name}</strong>
                    {l.code === 'es' && <Pill className="ml-2">Fallback global</Pill>}
                    {l.usedByCount === 0 && <Pill variant="warn" className="ml-2">Sin usar</Pill>}
                  </td>
                  <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                    {l.usedByCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {RESTAURANTS.filter(r => r.activeLocales.includes(l.code)).map(r => (
                          <Pill key={r.id}>{r.name}</Pill>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12.5px] text-[color:var(--color-muted)]">
                        Ningún restaurante lo tiene activo aún.
                      </span>
                    )}
                  </td>
                  <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                    <Button variant="ghost" size="sm">Editar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-[color:var(--color-border)] px-6 py-5">
            <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.005em]">Añadir idioma nuevo</h3>
          </div>
          <div className="p-6">
            <div className="mb-5">
              <label className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
                Código ISO 639-1 <span className="text-[color:var(--color-danger)]">*</span>
              </label>
              <p className="m-0 mb-2.5 text-[12.5px] leading-[1.55] text-[color:var(--color-muted)]">
                Dos letras minúsculas: it, de, pt…
              </p>
              <input
                placeholder="it"
                maxLength={2}
                className="tabular w-full rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none"
                style={{ textTransform: 'lowercase' }}
              />
            </div>
            <div className="mb-5">
              <label className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
                Nombre nativo <span className="text-[color:var(--color-danger)]">*</span>
              </label>
              <p className="m-0 mb-2.5 text-[12.5px] leading-[1.55] text-[color:var(--color-muted)]">
                Cómo verá el visitante el idioma en el switcher.
              </p>
              <input
                placeholder="Italiano"
                className="w-full rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <label className="mb-5 flex cursor-pointer items-center gap-2.5 text-[13px] text-[color:var(--color-ink-soft)]">
              <input type="checkbox" className="h-4 w-4" style={{ accentColor: 'var(--color-accent)' }} />
              Activar por defecto en todos los restaurantes
            </label>
            <Button variant="primary" className="w-full justify-center">
              <Plus className="h-4 w-4" />
              Crear idioma
            </Button>
            <Callout title="Cómo funciona" className="mt-4">
              Añadir un idioma solo lo pone <em>disponible</em>. Cada restaurante decide en su editor si lo activa. Los
              campos i18n muestran una pestaña nueva automáticamente.
            </Callout>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-5">
          <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.005em]">Usuarios del equipo</h3>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4" />
            Invitar
          </Button>
        </div>
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              {['Usuario', 'Rol', 'Restaurantes', 'Último acceso', ''].map(h => (
                <th
                  key={h}
                  className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USERS.map(u => (
              <tr key={u.id}>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white"
                      style={{ background: u.avatarColor }}
                    >
                      {u.initials}
                    </div>
                    <div>
                      <strong className="block font-semibold text-[color:var(--color-ink)]">{u.name}</strong>
                      <span className="slug">{u.email}</span>
                    </div>
                  </div>
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  {u.role === 'admin' ? <Pill variant="accent">Admin</Pill> : <Pill variant="role">Editor</Pill>}
                </td>
                <td className="border-b border-[color:var(--color-border)] px-5 py-3">
                  {u.restaurants.includes('*') ? (
                    <span className="slug">todos</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.restaurants.map(slug => {
                        const r = RESTAURANTS.find(x => x.slug === slug);
                        return <Pill key={slug}>{r?.name ?? slug}</Pill>;
                      })}
                    </div>
                  )}
                </td>
                <td className="slug border-b border-[color:var(--color-border)] px-5 py-3">
                  {u.lastAccessAt ? new Date(u.lastAccessAt).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
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
