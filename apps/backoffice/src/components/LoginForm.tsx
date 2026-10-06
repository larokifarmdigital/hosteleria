'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Mail } from 'lucide-react';
import { loginAction } from '@/lib/actions';

/**
 * Formulario de login usando useActionState (React 19) + server action.
 * El server action llama al api, relaya la cookie de sesión al cookie
 * store de Next y hace redirect a /dashboard.
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, { error: null as string | null });

  return (
    <form className="w-full max-w-[360px]" action={formAction}>
      <h2 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Iniciar sesión</h2>
      <p className="mb-7 text-[13.5px] text-[color:var(--color-muted)]">
        Accede con tu email del equipo.
      </p>

      <div className="mb-4">
        <label htmlFor="lg-email" className="mb-2 block text-[12px] font-semibold">Email</label>
        <input
          id="lg-email"
          name="email"
          type="email"
          required
          defaultValue="admin@hostelery.com"
          className="w-full rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="lg-pwd" className="mb-2 block text-[12px] font-semibold">Contraseña</label>
        <input
          id="lg-pwd"
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-[10px] border border-[color:var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]"
        />
      </div>

      {state.error && (
        <p className="mb-4 rounded-[10px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)] px-3 py-2 text-[12.5px] font-medium text-[color:var(--color-danger)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: 'var(--gradient-copper)',
          boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgb(255 255 255 / 0.2)'
        }}
      >
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        <span className="h-px flex-1 bg-[color:var(--color-border)]" />
        <span>o</span>
        <span className="h-px flex-1 bg-[color:var(--color-border)]" />
      </div>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] bg-white px-5 py-2.5 text-[13.5px] font-semibold hover:border-[color:var(--color-border-strong)]"
      >
        <Mail className="h-4 w-4" />
        Enviar enlace mágico
      </Link>
    </form>
  );
}
