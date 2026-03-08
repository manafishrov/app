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
import { Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/solid-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createEffect, createSignal, onCleanup, onMount, type Component } from 'solid-js';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { requestRovConfig } from '@/tauri';

const SettingsLayout: Component = () => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    if (!connectionStatusStore.isConnected && location().pathname.startsWith('/settings/rov')) {
      navigate({ to: '/settings', replace: true });
    }
  });

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
            <ScrollAreaViewport tabIndex={-1}>
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
  component: SettingsLayout,
  loader: requestRovConfig,
});
