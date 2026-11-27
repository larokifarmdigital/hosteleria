'use client';

import { useState } from 'react';
import type { Invitation, User } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { RowMenu } from '@/components/ui/Sortable';
import { showSuccessToast } from '@/lib/api';
import { useDeleteUser, useInviteUser, useUpdateUser } from '@/lib/query/hooks';
import { InvitationLink } from './InvitationLink';

/**
 * Lo ocasional de una cuenta, en el menú «⋯» de su fila: enlace para elegir contraseña,
 * suspender o reactivar, y eliminar. Editar (los datos) va aparte, con su icono.
 * Nadie puede suspenderse ni eliminarse a sí mismo.
 */
export function UserRowActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const invite = useInviteUser();
  const update = useUpdateUser();
  const remove = useDeleteUser();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const busy = invite.isPending || update.isPending || remove.isPending;

  return (
    <>
      <RowMenu
        name={user.name}
        actions={[
          { label: 'Crear enlace para elegir contraseña', disabled: busy, onSelect: () => void invite.mutateAsync(user.id).then(setInvitation, () => {}) },
          ...(isSelf ? [] : [
            {
              label: user.suspended ? 'Reactivar cuenta' : 'Suspender cuenta',
              disabled: busy,
              onSelect: () => void update.mutateAsync({ id: user.id, body: { suspended: !user.suspended } }).then(
                u => showSuccessToast(u.suspended ? 'Cuenta suspendida' : 'Cuenta reactivada', u.suspended ? 'Se han cerrado sus sesiones.' : undefined),
                () => {}
              )
            },
            { label: 'Eliminar', danger: true, separated: true, disabled: busy, onSelect: () => setDeleting(true) }
          ])
        ]}
      />
      {invitation && (
        <Modal open onClose={() => setInvitation(null)} title="Enlace para elegir contraseña">
          <InvitationLink invitation={invitation} name={user.name} />
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={() => setInvitation(null)}>Hecho</Button>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`¿Eliminar a ${user.name}?`}
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando…"
        pending={remove.isPending}
        onConfirm={() => remove.mutateAsync(user.id).then(() => { showSuccessToast('Usuario eliminado'); setDeleting(false); }, () => {})}
      >
        <p className="m-0">Pierde el acceso al momento y no se puede deshacer. Si solo quieres que deje de entrar por un tiempo, suspende la cuenta.</p>
      </ConfirmDialog>
    </>
  );
}
