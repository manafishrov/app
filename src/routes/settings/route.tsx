import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/Sidebar';

export const Route = createFileRoute('/settings')({
  component: SidebarLayout,
});

function SidebarLayout() {
  return (
    <SidebarProvider>
      <SettingsSidebar />
      <SidebarTrigger />
      <main>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
