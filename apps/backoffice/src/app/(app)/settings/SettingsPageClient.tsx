'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Language, User } from '@hosteleria/api-client';
import { LanguageDialog } from '@/components/settings/LanguageDialog';
import { UserDialog } from '@/components/settings/UserDialog';
import { Button } from '@/components/shared/Button';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pill } from '@/components/shared/Pill';
import { Table, Td } from '@/components/shared/Table';
import { formatDate } from '@/lib/utils';
import { useLanguages, useRestaurants, useSession, useUsers } from '@/lib/query/hooks';

const LANGUAGE_COLUMNS = [{ label: 'Código' }, { label: 'Idioma' }, { label: 'Restaurantes que lo usan' }, { label: 'Acciones', hidden: true }];
const USER_COLUMNS = [{ label: 'Usuario' }, { label: 'Rol' }, { label: 'Restaurantes' }, { label: 'Último acceso' }, { label: 'Acciones', hidden: true }];

type Editing = { kind: 'user'; user: User | null } | { kind: 'language'; language: Language | null } | null;

export function SettingsPageClient() {
  const { data: me } = useSession();
  const languagesQuery = useLanguages();
  const usersQuery = useUsers();
  const restaurantsQuery = useRestaurants();
  const languages = languagesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const restaurants = restaurantsQuery.data ?? [];
  const [editing, setEditing] = useState<Editing>(null);

  const usedBy = (code: string) => restaurants.filter(r => r.activeLocales.includes(code));

  return (
    <>
      <PageHeader title="Ajustes">Idiomas disponibles y usuarios del equipo.</PageHeader>

      <QueryBoundary queries={[languagesQuery, usersQuery, restaurantsQuery]}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] font-bold tracking-[-0.005em]">Idiomas</h2>
        <Button onClick={() => setEditing({ kind: 'language', language: null })}>
          <Plus aria-hidden className="h-4 w-4" />
          Añadir idioma
        </Button>
      </div>
      <div className="mb-8">
        <Table caption="Idiomas" columns={LANGUAGE_COLUMNS}>
          {languages.map(l => {
            const using = usedBy(l.code);
            return (
              <tr key={l.id}>
                <Td className="font-bold uppercase text-[color:var(--color-ink)]">{l.code}</Td>
                <Td><strong className="font-semibold text-[color:var(--color-ink)]">{l.name}</strong></Td>
                <Td>
                  {using.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {using.map(r => <Pill key={r.id}>{r.name}</Pill>)}
                    </div>
                  ) : (
                    <span className="text-[13px] text-[color:var(--color-muted)]">Ninguno todavía</span>
                  )}
                </Td>
                <Td className="text-right">
                  <Button size="sm" aria-label={`Editar ${l.name}`} onClick={() => setEditing({ kind: 'language', language: l })}>Editar</Button>
                </Td>
              </tr>
            );
          })}
        </Table>
      </div>

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
                {u.suspended && <Pill>Suspendida</Pill>}
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
            <Td className="slug whitespace-nowrap">{u.lastAccessAt ? formatDate(u.lastAccessAt) : 'Aún no ha entrado'}</Td>
            <Td className="text-right">
              <Button size="sm" aria-label={`Editar a ${u.name}`} onClick={() => setEditing({ kind: 'user', user: u })}>Editar</Button>
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
      {editing?.kind === 'language' && (
        <LanguageDialog
          key={editing.language?.id ?? 'nuevo'}
          language={editing.language}
          existingCodes={languages.map(l => l.code as string)}
          usedBy={editing.language ? usedBy(editing.language.code) : []}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
