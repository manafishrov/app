import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { ScrollArea } from '@/components/ui/ScrollArea';
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
      <ScrollArea className='h-svh w-full'>
        <main className='mx-auto max-w-3xl p-8'>
          <Outlet />
        </main>
      </ScrollArea>
    </SidebarProvider>
  );
}
