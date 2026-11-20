'use client';

import { Building2, Image as ImageIcon, LayoutDashboard, Settings, UtensilsCrossed } from 'lucide-react';
import { useRestaurants, useSession } from '@/lib/query/hooks';
import { BrandMark } from './BrandMark';
import { NavItem } from './NavItem';
import { UserPill } from './UserPill';
import { LogoutButton } from './LogoutButton';

export function Sidebar() {
  const { data: user } = useSession();
  const { data: restaurants = [] } = useRestaurants();

  const isAdmin = user?.role === 'admin';
  const ownRestaurant = !isAdmin && restaurants.length === 1 ? restaurants[0] : null;

  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 flex h-screen w-[var(--sidebar-w)] flex-col overflow-y-auto border-r border-[color:var(--color-nav-border)] text-[color:var(--color-nav-fg)]"
      style={{ background: 'var(--color-nav-bg)' }}
    >
      <BrandMark />

      <div className="flex flex-1 flex-col px-3 pb-2 pt-4">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {ownRestaurant ? (
            <li>
              <NavItem href={`/restaurants/${ownRestaurant.slug}`} icon={<Building2 />} label={ownRestaurant.name} />
            </li>
          ) : (
            <>
              <li>
                <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Inicio" matchPrefix={false} />
              </li>
              <li>
                <NavItem href="/restaurants" icon={<Building2 />} label="Restaurantes" />
              </li>
            </>
          )}
          <li>
            <NavItem href="/dishes" icon={<UtensilsCrossed />} label="Carta" />
          </li>
          <li>
            <NavItem href="/media" icon={<ImageIcon />} label="Imágenes" />
          </li>
          {isAdmin && (
            <li className="mt-4 border-t border-[color:var(--color-nav-border)] pt-4">
              <NavItem href="/settings" icon={<Settings />} label="Ajustes" />
            </li>
          )}
        </ul>
        <div className="mt-auto pt-4">
          <LogoutButton />
        </div>
      </div>

      {user && <UserPill user={user} />}
    </nav>
  );
}
