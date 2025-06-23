import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SidebarProvider } from '@/components/ui/Sidebar';

export const Route = createFileRoute('/settings')({
  component: SidebarLayout,
});

function SidebarLayout() {
  return (
    <SidebarProvider>
      <SettingsSidebar />
      <main>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
