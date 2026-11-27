'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { ROW_ICON_BUTTON } from '@/components/ui/Sortable';
import type { User } from '@hosteleria/api-client';
import { UserDialog } from '@/components/settings/UserDialog';
import { UserRowActions } from '@/components/settings/UserRowActions';
import { Button } from '@/components/shared/Button';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pill } from '@/components/shared/Pill';
import { Table, Td } from '@/components/shared/Table';
import { formatDate } from '@/lib/utils';
import { useRestaurants, useSession, useUsers } from '@/lib/query/hooks';

const USER_COLUMNS = [{ label: 'Usuario' }, { label: 'Rol' }, { label: 'Restaurantes' }, { label: 'Estado' }, { label: 'Último acceso' }, { label: 'Acciones', hidden: true }];

type Editing = { kind: 'user'; user: User | null } | null;

export function SettingsPageClient() {
  const { data: me } = useSession();
  const usersQuery = useUsers();
  const restaurantsQuery = useRestaurants();
  const users = usersQuery.data ?? [];
  const restaurants = restaurantsQuery.data ?? [];
  const [editing, setEditing] = useState<Editing>(null);


  return (
    <>
      <PageHeader title="Administración">Quién entra al backoffice. Los idiomas de cada web se eligen en su editor, en «Idiomas».</PageHeader>

      <QueryBoundary queries={[usersQuery, restaurantsQuery]}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] font-bold tracking-[-0.005em]">Usuarios</h2>
        <Button onClick={() => setEditing({ kind: 'user', user: null })}>
          <Plus aria-hidden className="h-4 w-4" />
          Añadir usuario
        </Button>
      </div>
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
            <Td>
              <div className="flex flex-wrap gap-1">
                {u.role === 'admin' ? <Pill variant="accent">Administrador</Pill> : <Pill>Editor</Pill>}
              </div>
            </Td>
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
            <Td>
              {u.suspended ? <Pill variant="danger" dot>Suspendida</Pill> : u.lastAccessAt ? <Pill variant="ok" dot>Activa</Pill> : <Pill variant="warn" dot>Aún no ha entrado</Pill>}
            </Td>
            <Td className="slug whitespace-nowrap">{u.lastAccessAt ? formatDate(u.lastAccessAt) : '—'}</Td>
            <Td className="w-[1%] whitespace-nowrap">
              <div className="flex justify-end gap-1">
                <button type="button" className={ROW_ICON_BUTTON} aria-label={`Editar a ${u.name}`} title="Editar" onClick={() => setEditing({ kind: 'user', user: u })}>
                  <Pencil aria-hidden className="h-[18px] w-[18px]" />
                </button>
                <UserRowActions user={u} isSelf={u.id === me?.id} />
              </div>
            </Td>
          </tr>
        ))}
      </Table>
      </QueryBoundary>

      {editing?.kind === 'user' && (
        <UserDialog
          key={editing.user?.id ?? 'nuevo'}
          user={editing.user}
          restaurants={restaurants}
          currentUserId={me?.id ?? ''}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
