import type { LegalPageType } from '@hosteleria/api-client';

export const LEGAL_PAGES: { type: LegalPageType; title: string; description: string }[] = [
  { type: 'legal-notice', title: 'Aviso legal', description: 'Quién está detrás de la web: nombre de la empresa, NIF y datos de contacto.' },
  { type: 'privacy', title: 'Política de privacidad', description: 'Qué datos personales se recogen, por ejemplo al reservar, y para qué se usan.' },
  { type: 'cookies', title: 'Política de cookies', description: 'Qué cookies usa la web y cómo desactivarlas.' }
];

export function legalPageInfo(type: string) {
  return LEGAL_PAGES.find(p => p.type === type);
}
