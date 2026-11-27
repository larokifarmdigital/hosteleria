/**
 * Mensajes de «Ayuda y soporte» por Web3Forms (formulario → correo de soporte).
 * El plan gratuito solo acepta envíos desde el navegador, así que se llama en el cliente.
 * La clave es pública por diseño: solo sirve para mandar correos al buzón con el que se creó.
 * Sin `NEXT_PUBLIC_WEB3FORMS_KEY` no se envía nada y el diálogo enseña el correo de soporte.
 */
export const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY?.trim() || undefined;

/** Correo de soporte del backoffice (para responder y para cuando no hay Web3Forms). */
export const SUPPORT_EMAIL = 'pinedacuevaerick910@gmail.com';

export async function sendSupportMessage(data: {
  subject: string;
  fromName: string;
  replyTo?: string;
  /** Campos del correo, en este orden. */
  fields: Record<string, string>;
}): Promise<boolean> {
  if (!WEB3FORMS_KEY) return false;
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: data.subject,
        from_name: data.fromName,
        ...(data.replyTo ? { replyto: data.replyTo } : {}),
        botcheck: '',
        ...data.fields
      }),
      signal: AbortSignal.timeout(15_000)
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return res.ok && json?.success === true;
  } catch {
    return false;
  }
}
