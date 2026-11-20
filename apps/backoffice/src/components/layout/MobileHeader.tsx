'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

/** Solo en <1024px: la Sidebar pasa a un drawer que se cierra al navegar. */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('overlay-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overlay-open');
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[color:var(--color-border)] bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[10px] text-[13px] font-extrabold text-white"
            style={{ background: 'var(--gradient-copper)' }}
          >
            HS
          </div>
          <strong className="text-[14px] font-bold">Hosteleria Studio</strong>
        </div>
        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen(v => !v)}
          className="grid h-11 w-11 place-items-center rounded-[10px] border border-[color:var(--color-border)] text-[color:var(--color-ink)]"
        >
          {open ? <X aria-hidden className="h-4 w-4" /> : <Menu aria-hidden className="h-4 w-4" />}
        </button>
      </header>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
          <div id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú" className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}
    </>
  );
}
