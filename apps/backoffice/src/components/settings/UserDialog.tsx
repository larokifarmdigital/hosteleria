'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Invitation, Restaurant, User } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { Checkbox, FormSelect, TextInput } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useCreateUser, useUpdateUser } from '@/lib/query/hooks';
import { InvitationLink } from './InvitationLink';

interface FormValues {
  name: string;
  email: string;
  role: 'admin' | 'editor';
  restaurants: Record<string, boolean>;
}

interface Props {
  /** `null` = usuario nuevo. */
  user: User | null;
  restaurants: Restaurant[];
  /** Quien está usando la pantalla: no puede quitarse el acceso a sí mismo. */
  currentUserId: string;
  onClose: () => void;
}

export function UserDialog({ user, restaurants, currentUserId, onClose }: Props) {
  const isSelf = user?.id === currentUserId;
  const { register, handleSubmit, watch, setError, control: formControl, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'editor',
      restaurants: Object.fromEntries(restaurants.map(r => [r.slug, user?.restaurants.includes(r.slug) ?? false]))
    }
  });
  const role = watch('role');

  const create = useCreateUser();
  const update = useUpdateUser();
  const saving = create.isPending || update.isPending;

  // Tras crear al usuario o pedir un enlace nuevo, el diálogo enseña el enlace.
  const [invitation, setInvitation] = useState<{ invitation: Invitation; name: string } | null>(null);

  const onSubmit = handleSubmit(async values => {
    const name = values.name.trim();
    const email = values.email.trim();
    if (!name) { setError('name', { message: 'Escribe el nombre.' }, { shouldFocus: true }); return; }
    if (!user && !/^\S+@\S+\.\S+$/.test(email)) { setError('email', { message: 'Escribe un email válido, por ejemplo nombre@restaurante.com.' }, { shouldFocus: true }); return; }
    const restaurantSlugs = values.role === 'editor' ? Object.keys(values.restaurants).filter(slug => values.restaurants[slug]) : [];
    try {
      if (user) {
        await update.mutateAsync({ id: user.id, body: { name, role: values.role, restaurantSlugs } });
        showSuccessToast('Usuario guardado');
        onClose();
      } else {
        const created = await create.mutateAsync({ name, email, role: values.role, restaurantSlugs });
        showSuccessToast('Usuario creado');
        if (created.invitation) setInvitation({ invitation: created.invitation, name });
        else onClose();
      }
    } catch {
      // El hook ya muestra el error; el diálogo sigue abierto con lo escrito.
    }
  });

  if (invitation) {
    return (
      <Modal open onClose={onClose} title="Enlace para elegir contraseña">
        <InvitationLink invitation={invitation.invitation} name={invitation.name} />
        <div className="mt-5 flex justify-end">
          <Button variant="primary" onClick={onClose}>Hecho</Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        open
        onClose={() => { if (!saving) onClose(); }}
        title={user ? `Editar a ${user.name}` : 'Nuevo usuario'}
        description={user ? user.email : 'Al crearlo tendrás un enlace para que elija su contraseña.'}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <Field id="u-name" label="Nombre" error={errors.name?.message} required>
            {control => <TextInput autoComplete="off" {...control} {...register('name')} />}
          </Field>
          {!user && (
            <Field id="u-email" label="Email" hint="Con él iniciará sesión." error={errors.email?.message} required>
              {control => <TextInput type="email" autoComplete="off" {...control} {...register('email')} />}
            </Field>
          )}
          <Field
            id="u-role"
            label="Rol"
            hint={isSelf ? 'No puedes cambiar tu propio rol. Pídeselo a otro administrador.' : 'Un editor solo ve sus restaurantes. Un administrador los ve todos y gestiona usuarios e idiomas.'}
          >
            {control => (
              <FormSelect {...control} disabled={isSelf} control={formControl} name='role'>
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </FormSelect>
            )}
          </Field>

          {role === 'editor' && (
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1 p-0 text-[13px] font-semibold text-[color:var(--color-ink)]">Restaurantes que puede editar</legend>
              {restaurants.length === 0 ? (
                <p className="m-0 text-[13px] text-[color:var(--color-muted)]">Todavía no hay restaurantes.</p>
              ) : (
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  {restaurants.map(r => <Checkbox key={r.slug} id={`u-r-${r.slug}`} label={r.name} {...register(`restaurants.${r.slug}`)} />)}
                </div>
              )}
              <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">Sin ninguno marcado, puede entrar pero no verá nada.</p>
            </fieldset>
          )}

          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando…' : user ? 'Guardar' : 'Crear usuario'}</Button>
          </div>
        </form>

      </Modal>

    </>
  );
}
