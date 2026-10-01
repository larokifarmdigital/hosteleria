import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileHeader } from '@/components/layout/MobileHeader';

export default function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[var(--sidebar-w)_1fr]">
      <div className="max-lg:hidden">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-col">
        <MobileHeader />
        <div className="hidden lg:block">
          <Topbar />
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[1240px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
