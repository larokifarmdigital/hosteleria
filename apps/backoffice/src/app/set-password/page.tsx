import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';
import { SetPasswordForm } from '@/components/SetPasswordForm';

export const metadata: Metadata = { title: 'Elige tu contraseña', robots: { index: false } };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthShell>
      <SetPasswordForm token={token ?? ''} />
    </AuthShell>
  );
}
