'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@hosteleria/api-client';
import { api } from '@/lib/api/browser';

const INPUT =
  'w-full rounded-[10px] border border-[color:var(--color-border-strong)] bg-white px-3.5 py-3 text-[16px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]';

const LINK = 'inline-flex min-h-11 items-center font-semibold text-[color:var(--color-accent)] underline underline-offset-2';

/** Se llega desde el enlace de una invitación: el token va en la URL y sirve una sola vez. */
export function SetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-[360px]">
        <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Falta el enlace completo</h1>
        <p className="mb-5 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">
          Abre esta página desde el enlace que te han enviado, entero. Si no lo tienes, pide uno nuevo a un administrador.
        </p>
        <Link href="/login" className={LINK}>Ir a iniciar sesión</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-[360px]" role="status">
        <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Contraseña guardada</h1>
        <p className="mb-5 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">Ya puedes entrar con tu email y la contraseña que acabas de elegir.</p>
        <Link href="/login" className={LINK}>Iniciar sesión</Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== repeat) { setError('Las dos contraseñas no coinciden. Vuelve a escribirlas.'); return; }
    setPending(true);
    setError(null);
    try {
      await api.auth.setPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido guardar. Inténtalo de nuevo.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="w-full max-w-[360px]" onSubmit={onSubmit} noValidate aria-describedby={error ? 'sp-error' : undefined}>
      <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Elige tu contraseña</h1>
      <p className="mb-7 text-[13.5px] leading-[1.5] text-[color:var(--color-muted)]">Con ella y tu email entrarás en Hosteleria Studio.</p>

      <div className="mb-4">
        <label htmlFor="sp-pwd" className="mb-2 block cursor-pointer text-[13px] font-semibold">Contraseña nueva</label>
        <input
          id="sp-pwd" type="password" autoComplete="new-password" required aria-describedby="sp-hint"
          value={password} onChange={e => setPassword(e.target.value)} className={INPUT}
        />
        <p id="sp-hint" className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
          Al menos 8 caracteres. Mejor una frase larga que no uses en otro sitio.
        </p>
      </div>
      <div className="mb-5">
        <label htmlFor="sp-repeat" className="mb-2 block cursor-pointer text-[13px] font-semibold">Repítela</label>
        <input
          id="sp-repeat" type="password" autoComplete="new-password" required
          value={repeat} onChange={e => setRepeat(e.target.value)} className={INPUT}
        />
      </div>

      <p
        id="sp-error"
        role="alert"
        className={
          error
            ? 'mb-4 rounded-[10px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[color:var(--color-danger)]'
            : 'sr-only'
        }
      >
        {error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: 'var(--gradient-copper)', boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgb(255 255 255 / 0.2)' }}
      >
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
