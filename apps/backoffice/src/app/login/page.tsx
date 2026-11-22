import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from '@/components/LoginForm';
import { safeNext } from '@/lib/auth/paths';

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <AuthShell>
      <LoginForm next={safeNext(next)} />
    </AuthShell>
  );
}
