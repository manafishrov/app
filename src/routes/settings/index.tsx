import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';
import { Outlet } from '@tanstack/solid-router';

// import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
// import { ScrollArea } from '@/components/ui/ScrollArea';
// import { SidebarProvider } from '@/components/ui/Sidebar';
// import { useRovConfigListener } from '@/hooks/useRovConfigListener';
import { requestRovConfig } from '@/stores/rovConfig';

const SidebarLayout: Component = () => {
  // useRovConfigListener();
    return (
        <div class='flex h-svh'>
            {/* <SettingsSidebar /> */}
            <div class='relative h-svh w-full overflow-auto'>
                <main class='mx-auto max-w-3xl p-8'>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export const Route = createFileRoute('/settings')({
    component: SidebarLayout,
    loader: requestRovConfig,
});
