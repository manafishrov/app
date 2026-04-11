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

import { SettingsSidebar } from '@/features/settings/SettingsSidebar';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { requestRovConfig } from '@/tauri';

const noop = function noop(): void {
  // Noop
};

const useSettingsLayoutSetup = (setIsFullscreen: (val: boolean) => void): void => {
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    if (!connectionStatusStore.isConnected && location().pathname.startsWith('/settings/rov')) {
      navigate({ to: '/settings', replace: true }).catch(noop);
    }
  });

  const updateFullscreenState = (): void => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen).catch(noop);
  };

  let unlistenResize: () => void = noop;

  onMount(() => {
    const win = getCurrentWindow();
    updateFullscreenState();

    win
      .onResized(() => {
        updateFullscreenState();
      })
      .then((cleanup) => {
        unlistenResize = cleanup;
      })
      .catch(noop);
  });

  onCleanup(() => {
    unlistenResize();
  });
};

const SettingsLayout: Component = () => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  useSettingsLayoutSetup(setIsFullscreen);

  return (
    <SidebarProvider defaultOpen>
      <SidebarLayout class={cn('size-full', !isFullscreen() && 'pt-7')}>
        <SettingsSidebar isFullscreen={isFullscreen()} />
        <SidebarInset class={cn(isFullscreen() && 'mt-6')}>
          <ScrollArea class='relative size-full'>
            <ScrollAreaViewport tabIndex={-1}>
              <ScrollAreaContent>
                <div class='relative mx-auto w-full max-w-3xl p-4 md:p-8'>
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
