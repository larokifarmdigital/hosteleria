/**
 * Puerto para envío de emails transaccionales.
 *
 * Impls disponibles (en `infrastructure/email/`):
 *  - `ConsoleEmailSender` → loguea en consola (dev, sin consumir quota)
 *  - `ResendEmailSender`  → envía vía resend.com (prod)
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  /** Envía un email. Devuelve el id del provider (para tracking/logs). */
  send(input: SendEmailInput): Promise<{ id: string }>;
}
