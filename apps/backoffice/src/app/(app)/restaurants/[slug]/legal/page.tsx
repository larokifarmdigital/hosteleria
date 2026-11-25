import { redirect } from 'next/navigation';

// Los textos legales son una sección del editor de la web.
export default async function LegalPagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/restaurants/${slug}?s=legal`);
}
