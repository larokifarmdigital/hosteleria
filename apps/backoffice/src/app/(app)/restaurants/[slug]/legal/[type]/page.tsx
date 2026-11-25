import { redirect } from 'next/navigation';

// Los textos legales son una sección del editor de la web.
export default async function LegalPageEditorPage({ params }: { params: Promise<{ slug: string; type: string }> }) {
  const { slug, type } = await params;
  redirect(`/restaurants/${slug}?s=legal&p=${encodeURIComponent(type)}`);
}
