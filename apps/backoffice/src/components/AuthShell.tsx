/** Marco de las páginas sin sesión (entrar, elegir contraseña): marca a la izquierda, formulario a la derecha. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div
        className="relative flex flex-col justify-between overflow-hidden p-[60px] text-white max-lg:hidden"
        style={{ background: 'var(--gradient-copper-deep)' }}
      >
        <div
          aria-hidden
          className="absolute -right-[120px] -top-[120px] h-[440px] w-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(230,178,148,0.4), transparent 68%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-[100px] -left-[100px] h-[360px] w-[360px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(197,105,71,0.4), transparent 70%)' }}
        />

        <div className="relative flex items-center gap-3">
          <div
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[14px] font-extrabold text-white"
            style={{
              background: 'var(--gradient-copper)',
              boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.28)'
            }}
          >
            HS
          </div>
          <strong className="text-[16px] font-bold tracking-[-0.01em]">Hosteleria Studio</strong>
        </div>

        <div className="relative max-w-[460px]">
          <p className="mb-4 text-[40px] font-bold leading-[1.1] tracking-[-0.025em]">
            El contenido de tus restaurantes, en un solo sitio.
          </p>
          <p className="text-[14.5px] leading-[1.65] text-[#e9dccb]">
            Edita los textos, la carta, los horarios y las fotos de la web de tu restaurante.
          </p>
        </div>

        <p className="relative m-0 text-[12px] text-[#d4c3a8]">© 2026 · Grupo Hosteleria</p>
      </div>

      <div className="grid place-items-center p-6 sm:p-10">{children}</div>
    </main>
  );
}
