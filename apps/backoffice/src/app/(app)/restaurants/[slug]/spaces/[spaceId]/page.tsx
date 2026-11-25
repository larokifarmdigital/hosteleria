import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string; spaceId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// El espacio ya no tiene pantalla propia: sus secciones están en el editor de la web.
const SECTION_OF_TAB: Record<string, string> = { cover: 'cover', photos: 'photos', hours: 'hours', contact: 'contact' };

export default async function SpaceEditorPage({ params, searchParams }: Props) {
  const { slug, spaceId } = await params;
  const { tab } = await searchParams;
  redirect(`/restaurants/${slug}?s=${SECTION_OF_TAB[tab ?? ''] ?? 'cover'}&e=${encodeURIComponent(spaceId)}`);
}
