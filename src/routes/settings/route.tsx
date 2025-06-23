import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SidebarProvider } from '@/components/ui/Sidebar';

export const Route = createFileRoute('/settings')({
  component: SidebarLayout,
});

function SidebarLayout() {
  return (
    <SidebarProvider
      collapseOnMobile
      style={
        {
          '--sidebar-width': '10rem',
          '--sidebar-width-mobile': '12rem',
        } as React.CSSProperties
      }
    >
      <SettingsSidebar />
      <main className='mx-auto max-w-3xl p-4 md:p-6 lg:p-8'>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
