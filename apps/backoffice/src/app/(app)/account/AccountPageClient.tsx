'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/shared/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { ApiError } from '@/lib/api/errorHandling';
import { showSuccessToast } from '@/lib/api/toast';
import { useChangePassword, useSession, useUpdateMe } from '@/lib/query/hooks';

const ROLE_LABEL = { admin: 'Administrador', editor: 'Gestor' } as const;
const CARD = 'rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 sm:p-6';

/** La cuenta de cada persona: su nombre y su contraseña. Usuarios, idiomas y restaurantes están en Administración. */
export function AccountPageClient() {
  const { data: user } = useSession();
  if (!user) return null;
  return (
    <div>
      <PageHeader title="Mi cuenta">Tu nombre y tu contraseña. Solo los ves tú.</PageHeader>
      {/* En pantallas anchas, los dos bloques uno al lado del otro: se usa todo el ancho. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <ProfileCard name={user.name} email={user.email} role={ROLE_LABEL[user.role]} />
        <PasswordCard />
      </div>
    </div>
  );
}

function ProfileCard({ name, email, role }: { name: string; email: string; role: string }) {
  const update = useUpdateMe();
  const form = useForm<{ name: string }>({ defaultValues: { name } });
  const { register, handleSubmit, formState: { errors, isDirty }, reset } = form;
  useEffect(() => { reset({ name }); }, [name, reset]);

  const onSubmit = handleSubmit(async values => {
    try {
      await update.mutateAsync({ name: values.name.trim() });
      showSuccessToast('Nombre guardado');
    } catch (err) {
      form.setError('name', { message: err instanceof ApiError ? err.message : 'No se ha podido guardar. Inténtalo de nuevo.' });
    }
  });

  return (
    <section aria-labelledby="perfil" className={CARD}>
      <h2 id="perfil" className="m-0 text-[17px] font-bold">Tus datos</h2>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
        <Field id="account-name" label="Nombre" hint="Es el que ven los demás en la lista de usuarios." error={errors.name?.message} required>
          {c => <TextInput {...c} autoComplete="name" {...register('name', {
            validate: v => (v.trim() ? (v.trim().length <= 80 || 'Como mucho 80 caracteres.') : 'Escribe tu nombre.')
          })} />}
        </Field>
        <dl className="m-0 grid grid-cols-1 gap-4 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-[13.5px] font-medium text-[color:var(--color-muted)]">Email para entrar</dt>
            <dd className="m-0 mt-1 break-all font-semibold">{email}</dd>
          </div>
          <div>
            <dt className="text-[13.5px] font-medium text-[color:var(--color-muted)]">Rol</dt>
            <dd className="m-0 mt-1 font-semibold">{role}</dd>
          </div>
        </dl>
        <p className="m-0 text-[13.5px] text-[color:var(--color-muted)]">El email y el rol solo los puede cambiar un administrador.</p>
        <div>
          <Button type="submit" variant="primary" disabled={!isDirty || update.isPending}>{update.isPending ? 'Guardando…' : 'Guardar nombre'}</Button>
        </div>
      </form>
    </section>
  );
}

type PasswordValues = { currentPassword: string; newPassword: string; repeat: string };

function PasswordCard() {
  const change = useChangePassword();
  const [done, setDone] = useState<string | null>(null);
  const form = useForm<PasswordValues>({ defaultValues: { currentPassword: '', newPassword: '', repeat: '' } });
  const { register, handleSubmit, formState: { errors }, setError, reset, getValues } = form;

  // «Cambiar contraseña» del menú de la cuenta llega con #contrasena: el cursor va directo al campo.
  useEffect(() => {
    if (window.location.hash === '#contrasena') document.getElementById('account-current-password')?.focus();
  }, []);

  const onSubmit = handleSubmit(async values => {
    setDone(null);
    try {
      const { closedSessions } = await change.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      const others = closedSessions === 0 ? '' : closedSessions === 1 ? ' Hemos cerrado la sesión que tenías abierta en otro sitio.' : ` Hemos cerrado las ${closedSessions} sesiones que tenías abiertas en otros sitios.`;
      setDone(`Contraseña cambiada.${others}`);
      showSuccessToast('Contraseña cambiada');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      if (code === 'WRONG_CURRENT_PASSWORD') setError('currentPassword', { message: 'No es tu contraseña actual. Revísala.' });
      else if (code === 'WEAK_PASSWORD') setError('newPassword', { message: (err as ApiError).message });
      else if (err instanceof ApiError && err.status === 429) setError('currentPassword', { message: 'Demasiados intentos. Espera una hora y vuelve a probar.' });
      else setError('newPassword', { message: 'No se ha podido cambiar. Inténtalo de nuevo.' });
    }
  });

  return (
    <section id="contrasena" aria-labelledby="contrasena-title" className={CARD}>
      <h2 id="contrasena-title" className="m-0 text-[17px] font-bold">Cambiar contraseña</h2>
      <p className="m-0 mt-1.5 text-[14px] text-[color:var(--color-muted)]">Se cerrará la sesión en los demás dispositivos; en este sigues dentro.</p>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
        <Field id="account-current-password" label="Contraseña actual" error={errors.currentPassword?.message} required>
          {c => <TextInput {...c} type="password" autoComplete="current-password" {...register('currentPassword', { required: 'Escribe tu contraseña actual.' })} />}
        </Field>
        <Field id="account-new-password" label="Contraseña nueva" hint="Al menos 8 caracteres. Mejor varias palabras que no tengan que ver contigo." error={errors.newPassword?.message} required>
          {c => <TextInput {...c} type="password" autoComplete="new-password" {...register('newPassword', {
            required: 'Escribe la contraseña nueva.',
            minLength: { value: 8, message: 'Tiene que tener al menos 8 caracteres.' }
          })} />}
        </Field>
        <Field id="account-repeat-password" label="Repite la contraseña nueva" error={errors.repeat?.message} required>
          {c => <TextInput {...c} type="password" autoComplete="new-password" {...register('repeat', {
            validate: v => v === getValues('newPassword') || 'No coincide con la contraseña nueva.'
          })} />}
        </Field>
        {done && <p role="status" className="m-0 rounded-[8px] bg-[color:var(--color-ok-soft)] px-3 py-2.5 text-[14px] font-semibold text-[color:var(--color-ok-fg)]">{done}</p>}
        <div>
          <Button type="submit" variant="primary" disabled={change.isPending}>{change.isPending ? 'Cambiando…' : 'Cambiar contraseña'}</Button>
        </div>
      </form>
    </section>
  );
}
