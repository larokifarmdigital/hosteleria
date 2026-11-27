'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { SessionUser } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { Select, TextArea } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { SUPPORT_EMAIL, WEB3FORMS_KEY, sendSupportMessage } from '@/lib/support/web3forms';

const REASONS = [
  { value: 'problema', label: 'Algo no funciona' },
  { value: 'duda', label: 'Tengo una duda' },
  { value: 'idea', label: 'Una idea o sugerencia' }
];
const MAX = 2000;
const PLACEHOLDER: Record<string, string> = {
  problema: 'Qué intentabas hacer y qué ha pasado. Por ejemplo: al publicar la carta sale un error.',
  duda: 'Escribe tu pregunta.',
  idea: '¿Qué te gustaría que hiciera el backoffice?'
};

const DEV_NOTICE = process.env.NODE_ENV !== 'production' && !WEB3FORMS_KEY
  ? 'Solo en local: falta NEXT_PUBLIC_WEB3FORMS_KEY en apps/backoffice/.env.local. Sin ella, «Enviar» abre el programa de correo con el mensaje.'
  : null;

/**
 * «Ayuda y soporte» del menú de la cuenta, como en el backoffice de larokifarm: siempre el
 * mismo formulario. Con clave de Web3Forms llega al correo de soporte con quién escribe y en
 * qué pantalla estaba; sin ella, «Enviar» abre su programa de correo con el mensaje ya escrito.
 */
export function HelpDialog({ user, onClose }: { user: SessionUser; onClose: () => void }) {
  const pathname = usePathname();
  const [reason, setReason] = useState('problema');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFailed(false);
    const text = message.trim();
    if (text.length < 5) {
      setError('Cuéntanos qué pasa, con unas palabras al menos.');
      document.getElementById('help-message')?.focus();
      return;
    }
    const label = REASONS.find(r => r.value === reason)!.label;
    const subject = `[Hosteleria Studio] ${label} — ${user.name}`;
    const fields = {
      Motivo: label,
      Mensaje: text,
      Persona: `${user.name} <${user.email}>`,
      Rol: user.role === 'admin' ? 'Administrador' : 'Gestor',
      'Estaba en': `${window.location.origin}${pathname}${window.location.search}`
    };
    if (!WEB3FORMS_KEY) {
      // Sin Web3Forms: el mensaje va escrito en su programa de correo, dirigido a soporte.
      const body = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n\n');
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showSuccessToast('Se abre tu correo', 'El mensaje ya va escrito: solo tienes que enviarlo.');
      onClose();
      return;
    }
    setSending(true);
    const ok = await sendSupportMessage({ subject, fromName: 'Hosteleria Studio', replyTo: user.email, fields });
    setSending(false);
    if (!ok) { setFailed(true); return; }
    showSuccessToast('Mensaje enviado', `Te responderemos a ${user.email}.`);
    onClose();
  };

  return (
    <Modal open onClose={() => { if (!sending) onClose(); }} title="Ayuda y soporte" description={`Escríbenos y te responderemos a ${user.email}.`}>
      <form onSubmit={send} noValidate className="flex flex-col gap-5">
        {DEV_NOTICE && <p className="m-0 rounded-[8px] bg-[color:var(--color-warn-soft)] px-3 py-2.5 text-[13px] text-[color:var(--color-warn-fg)]">{DEV_NOTICE}</p>}
        {failed && (
          <p role="alert" className="m-0 rounded-[8px] bg-[color:var(--color-danger-soft)] px-3 py-2.5 text-[14px] font-semibold text-[color:var(--color-danger)]">
            No se ha podido enviar. Inténtalo de nuevo o escribe a {SUPPORT_EMAIL}.
          </p>
        )}
        <Field id="help-reason" label="¿En qué te ayudamos?">
          {c => (
            <Select {...c} value={reason} onChange={e => setReason(e.target.value)}>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          )}
        </Field>
        <Field
          id="help-message"
          label="Cuéntanos"
          required
          hint="Se envía también en qué pantalla estabas, para ayudarte antes."
          error={error ?? undefined}
          count={{ value: message.length, max: MAX }}
        >
          {c => <TextArea {...c} rows={6} maxLength={MAX} value={message} placeholder={PLACEHOLDER[reason]} onChange={e => setMessage(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button disabled={sending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
