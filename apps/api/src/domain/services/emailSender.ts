export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  /** El `id` devuelto es el del provider — para logs/tracking. */
  send(input: SendEmailInput): Promise<{ id: string }>;
}
