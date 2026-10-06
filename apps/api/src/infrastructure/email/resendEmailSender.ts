import type { EmailSender, SendEmailInput } from '../../domain/services/emailSender.js';

/**
 * Impl del `EmailSender` que envía vía resend.com.
 *
 * Para añadir otro provider (SendGrid/Postmark/…): crear otra clase que
 * implemente `EmailSender`. La selección entre impls vive en el
 * composition root (`interface/http/`).
 */
export class ResendEmailSender implements EmailSender {
  constructor(private apiKey: string, private from: string) {}

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text
      })
    });
    const body = await res.json().catch(() => ({})) as { id?: string; error?: unknown };
    if (!res.ok) throw new Error(`resend_failed: ${JSON.stringify(body.error ?? body)}`);
    return { id: body.id ?? 'unknown' };
  }
}
