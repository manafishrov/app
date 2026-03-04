import {
  ScrollArea,
  ScrollAreaCorner,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@manafishrov/ui/scroll-area';
import { SidebarInset, SidebarLayout, SidebarProvider } from '@manafishrov/ui/sidebar';
import { Outlet, createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { requestRovConfig } from '@/stores/rovConfig';

const SettingsLayoutRoute: Component = () => {
  return (
    <SidebarProvider defaultOpen>
      <SidebarLayout class='h-full min-h-0 mt-8'>
        <SettingsSidebar />
        <SidebarInset class='min-h-0'>
          <ScrollArea class='relative min-h-0 flex-1'>
            <ScrollAreaViewport class='h-full'>
              <ScrollAreaContent class='min-h-full'>
                <div class='max-w-3xl mx-auto p-8'>
                  <Outlet />
                </div>
              </ScrollAreaContent>
            </ScrollAreaViewport>
            <ScrollAreaScrollbar>
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
            <ScrollAreaCorner />
          </ScrollArea>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  );
};

export const Route = createFileRoute('/settings')({
  component: SettingsLayoutRoute,
  loader: requestRovConfig,
});
