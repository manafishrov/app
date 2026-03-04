import { cn } from '@manafishrov/ui';
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
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type Component, createSignal, onCleanup, onMount } from 'solid-js';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { requestRovConfig } from '@/stores/rovConfig';

const SettingsLayoutRoute: Component = () => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  const updateFullscreenState = async (): Promise<void> => {
    setIsFullscreen(await getCurrentWindow().isFullscreen());
  };

  onMount(async () => {
    const win = getCurrentWindow();
    await updateFullscreenState();

    const unlistenResize = await win.onResized(() => {
      void updateFullscreenState();
    });

    onCleanup(() => {
      unlistenResize();
    });
  });

  return (
    <SidebarProvider defaultOpen>
      <SidebarLayout class={cn('h-full min-h-0', !isFullscreen() && 'mt-8')}>
        <SettingsSidebar isFullscreen={isFullscreen()} />
        <SidebarInset class={cn('min-h-0', isFullscreen() && 'mt-6')}>
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
