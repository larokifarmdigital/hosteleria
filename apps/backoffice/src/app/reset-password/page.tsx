import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';
import { SetPasswordForm } from '@/components/SetPasswordForm';

export const metadata: Metadata = { title: 'Contraseña nueva', robots: { index: false } };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

// Destino del correo de «Olvidé mi contraseña» (`/auth/forgot`).
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthShell>
      <SetPasswordForm token={token ?? ''} mode="reset" />
    </AuthShell>
  );
}
