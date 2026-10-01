import { BrandMark } from './BrandMark';
import { NavItem } from './NavItem';
import { UserPill } from './UserPill';
import { LogoutButton } from './LogoutButton';
import {
  LayoutDashboard,
  Building2,
  UtensilsCrossed,
  Image as ImageIcon,
  Settings
} from 'lucide-react';

export function Sidebar() {
  return (
    <aside
      className="sticky top-0 flex h-screen w-[var(--sidebar-w)] flex-col overflow-y-auto border-r border-[color:var(--color-nav-border)] text-[color:var(--color-nav-fg)]"
      style={{ background: 'var(--color-nav-bg)' }}
    >
      <BrandMark />

      <nav className="px-3 pt-4 pb-2">
        <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
          Contenido
        </div>
        <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Dashboard" matchPrefix={false} />
        <NavItem href="/restaurants" icon={<Building2 />} label="Restaurantes" count={6} />
        <NavItem href="/dishes" icon={<UtensilsCrossed />} label="Carta" count={148} />
        <NavItem href="/media" icon={<ImageIcon />} label="Media" count={312} />
      </nav>

      <nav className="px-3 pt-4">
        <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
          Sistema
        </div>
        <NavItem href="/settings" icon={<Settings />} label="Ajustes" />
        <LogoutButton />
      </nav>

      <UserPill />
    </aside>
  );
}
