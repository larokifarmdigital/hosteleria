'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Invitation } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';

/** El enlace para elegir contraseña, listo para copiar y enviárselo a la persona. */
export function InvitationLink({ invitation, name }: { invitation: Invitation; name: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window === 'undefined' ? '' : window.location.origin}/set-password?token=${invitation.token}`;
  const hours = Math.max(1, Math.round((new Date(invitation.expiresAt).getTime() - Date.now()) / 3_600_000));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Sin permiso para el portapapeles: el enlace sigue ahí para seleccionarlo a mano.
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
      <p className="m-0 text-[14px] font-semibold text-[color:var(--color-ink)]">Envía este enlace a {name}</p>
      <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[color:var(--color-muted)]">
        Con él elige su contraseña. Sirve una sola vez y caduca en {hours} horas. Solo se muestra ahora: cópialo antes de cerrar.
      </p>
      <label htmlFor="invitation-url" className="sr-only">Enlace para elegir contraseña</label>
      <input
        id="invitation-url"
        readOnly
        value={url}
        onFocus={e => e.currentTarget.select()}
        className="mt-3 w-full rounded-[10px] border border-[color:var(--color-border-strong)] bg-white px-3.5 py-2.5 font-mono text-[13px] text-[color:var(--color-ink)]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={copy}>
          {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
          Copiar enlace
        </Button>
        <span role="status" className="text-[13px] font-medium text-[color:var(--color-ok-fg)]">{copied ? 'Enlace copiado.' : ''}</span>
      </div>
    </div>
  );
}
