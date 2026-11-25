'use client';

import { EditorProvider } from '@/components/site-editor/EditorContext';
import { SiteEditor } from '@/components/site-editor/SiteEditor';
import { useLanguages, useRestaurant, useSession, useSpaces } from '@/lib/query/hooks';

/** La web de un restaurante se edita entera desde aquí: un menú de secciones, guardado automático y un solo «Publicar». */
export function RestaurantHubPageClient({ slug }: { slug: string }) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: spaces = [] } = useSpaces(slug);
  const { data: languages = [] } = useLanguages();
  const { data: user } = useSession();

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant) return null;

  const localeNames = Object.fromEntries(languages.map(l => [l.code, l.name]));

  return (
    <EditorProvider restaurant={restaurant} spaces={spaces} localeNames={localeNames} isAdmin={user?.role === 'admin'}>
      <SiteEditor />
    </EditorProvider>
  );
}
