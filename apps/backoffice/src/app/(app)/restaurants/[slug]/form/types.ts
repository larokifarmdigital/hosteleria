import type { Restaurant } from '@hosteleria/api-client';
import type { MediaScope } from '@/components/media/types';

/** Lo que comparten las pestañas de la ficha. */
export interface TabProps {
  restaurant: Restaurant;
  /** Props de idioma para cada `I18nField`. */
  i18n: { locales: string[]; activeLocale: string; localeNames: Record<string, string>; defaultLocale: string };
  mediaScope: MediaScope;
  /** Selector de idioma, ya enlazado al estado del formulario. */
  localeTabs: React.ReactNode;
  /** Nº de textos con traducción pendiente en una sección. */
  pendingIn: (section: string) => number;
}
