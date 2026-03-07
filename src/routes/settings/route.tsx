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
import { createSignal, onCleanup, onMount, type Component } from 'solid-js';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { requestRovConfig } from '@/tauri';

const SettingsLayoutRoute: Component = () => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  const updateFullscreenState = async (): Promise<void> => {
    setIsFullscreen(await getCurrentWindow().isFullscreen());
  };

  let unlistenResize: (() => void) | undefined;

  onMount(async () => {
    const win = getCurrentWindow();
    await updateFullscreenState();

    unlistenResize = await win.onResized(() => {
      void updateFullscreenState();
    });
  });

  onCleanup(() => {
    unlistenResize?.();
  });

  return (
    <SidebarProvider defaultOpen>
      <SidebarLayout class={cn('size-full', !isFullscreen() && 'pt-8')}>
        <SettingsSidebar isFullscreen={isFullscreen()} />
        <SidebarInset class={cn(isFullscreen() && 'mt-6')}>
          <ScrollArea class='relative size-full'>
            <ScrollAreaViewport>
              <ScrollAreaContent>
                <div class='w-full max-w-3xl mx-auto p-4 md:p-8 relative'>
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
