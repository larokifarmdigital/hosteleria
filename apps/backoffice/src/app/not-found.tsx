import { LinkButton } from '@/components/shared/Button';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.015em]">No encontramos esta página</h1>
        <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">Puede que el enlace esté mal.</p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/" variant="primary">Volver al inicio</LinkButton>
        </div>
      </div>
    </main>
  );
}
