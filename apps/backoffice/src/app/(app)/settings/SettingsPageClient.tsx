'use client';

import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pill } from '@/components/shared/Pill';
import { Table, Td } from '@/components/shared/Table';
import { formatDate } from '@/lib/utils';
import { useLanguages, useUsers, useRestaurants } from '@/lib/query/hooks';

const LANGUAGE_COLUMNS = [{ label: 'Código' }, { label: 'Idioma' }, { label: 'Restaurantes que lo usan' }];
const USER_COLUMNS = [{ label: 'Usuario' }, { label: 'Rol' }, { label: 'Restaurantes' }, { label: 'Último acceso' }];

export function SettingsPageClient() {
  const languagesQuery = useLanguages();
  const usersQuery = useUsers();
  const restaurantsQuery = useRestaurants();
  const languages = languagesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const restaurants = restaurantsQuery.data ?? [];

  return (
    <>
      <PageHeader title="Ajustes">Idiomas disponibles y usuarios del equipo.</PageHeader>

      <QueryBoundary queries={[languagesQuery, usersQuery, restaurantsQuery]}>
      <h2 className="mb-3.5 text-[15px] font-bold tracking-[-0.005em]">Idiomas</h2>
      <div className="mb-8">
        <Table caption="Idiomas" columns={LANGUAGE_COLUMNS}>
          {languages.map(l => {
            const usedBy = restaurants.filter(r => r.activeLocales.includes(l.code));
            return (
              <tr key={l.id}>
                <Td className="font-bold uppercase text-[color:var(--color-ink)]">{l.code}</Td>
                <Td><strong className="font-semibold text-[color:var(--color-ink)]">{l.name}</strong></Td>
                <Td>
                  {usedBy.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {usedBy.map(r => <Pill key={r.id}>{r.name}</Pill>)}
                    </div>
                  ) : (
                    <span className="text-[13px] text-[color:var(--color-muted)]">Ninguno todavía</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </div>

      <h2 className="mb-3.5 text-[15px] font-bold tracking-[-0.005em]">Usuarios</h2>
      <Table caption="Usuarios" columns={USER_COLUMNS}>
        {users.map(u => (
          <tr key={u.id}>
            <Td>
              <div className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                  style={{ background: u.avatarColor }}
                >
                  {u.initials}
                </div>
                <div className="min-w-0">
                  <strong className="block font-semibold text-[color:var(--color-ink)]">{u.name}</strong>
                  <span className="slug">{u.email}</span>
                </div>
              </div>
            </Td>
            <Td>{u.role === 'admin' ? <Pill variant="accent">Administrador</Pill> : <Pill>Editor</Pill>}</Td>
            <Td>
              {u.restaurants.includes('*') ? (
                <span className="text-[13px] text-[color:var(--color-ink-soft)]">Todos</span>
              ) : u.restaurants.length === 0 ? (
                <span className="text-[13px] text-[color:var(--color-muted)]">Ninguno</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {u.restaurants.map(slug => (
                    <Pill key={slug}>{restaurants.find(r => r.slug === slug)?.name ?? slug}</Pill>
                  ))}
                </div>
              )}
            </Td>
            <Td className="slug whitespace-nowrap">{u.lastAccessAt ? formatDate(u.lastAccessAt) : 'Nunca'}</Td>
          </tr>
        ))}
      </Table>
      </QueryBoundary>
    </>
  );
}
