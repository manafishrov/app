import type { Component } from 'solid-js';

import { LocaleProvider, ThemeProvider } from '@manafishrov/ui';
import { Spinner } from '@manafishrov/ui/spinner';
import { Toaster } from '@manafishrov/ui/toaster';
import { TanStackDevtools } from '@tanstack/solid-devtools';
import { HeadContent, Outlet, createRootRoute, redirect } from '@tanstack/solid-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/solid-router-devtools';

import { Header } from '@/features/header';
import { disableContextMenu } from '@/lib/contextMenu';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { getLocale, shouldRedirect } from '@/paraglide/runtime';
import { configStore } from '@/stores/config';
import { rovConfigStore } from '@/stores/rovConfig';
import { updatesStore } from '@/stores/updates';
import {
  checkForAppUpdates,
  checkForFirmwareUpdates,
  closeSplashscreen,
  getConfig,
  initializeVideoDirectory,
  refreshFirmwareUpdateStatus,
  recoverTempRecordings,
  setupAllListeners,
} from '@/tauri';

const setupAppListeners = (cleanupFns: (() => void)[]): void => {
  setupAllListeners()
    .then((tauriCleanup) => {
      cleanupFns.push(tauriCleanup);

      const contextMenuCleanup = disableContextMenu();
      if (contextMenuCleanup) {
        cleanupFns.push(contextMenuCleanup);
      }

      if (configStore.checkForAppUpdatesOnStartup) {
        checkForAppUpdates(true).catch(logError);
      }
      return initializeVideoDirectory().then(() => recoverTempRecordings());
    })
    .catch(() => {
      const contextMenuCleanup = disableContextMenu();
      if (contextMenuCleanup) {
        cleanupFns.push(contextMenuCleanup);
      }
    });
};

const FirmwareUpdateStatusSync: Component = () => {
  let lastFirmwareUpdateCheckVersion = '';

  createEffect(() => {
    const { firmwareVersion } = rovConfigStore;
    if (firmwareVersion.trim() === '' || firmwareVersion.toUpperCase() === 'N/A') {
      return;
    }

    refreshFirmwareUpdateStatus();
    if (
      configStore.checkForFirmwareUpdatesOnConnect &&
      lastFirmwareUpdateCheckVersion !== firmwareVersion
    ) {
      lastFirmwareUpdateCheckVersion = firmwareVersion;
      checkForFirmwareUpdates(true).catch(logError);
    }
  });

  return <></>;
};

const firmwareUpdateBlocksApp = (): boolean => {
  const blockingStatuses = ['downloading', 'uploading', 'installing'];
  return blockingStatuses.includes(updatesStore.firmware.status);
};

const FirmwareUpdateOverlay: Component = () => (
  <Show when={firmwareUpdateBlocksApp()}>
    <div class='fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
      <div class='mx-4 flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-2xl'>
        <Spinner class='size-6' />
        <div class='space-y-1'>
          <p class='font-medium'>{m.toasts_firmware_update_overlay_title()}</p>
          <p class='text-sm text-muted-foreground'>
            {m.alerts_firmware_update_wait_for_completion()}
          </p>
        </div>
      </div>
    </div>
  </Show>
);

const RootLayout: Component = () => {
  const cleanupFns: (() => void)[] = [];

  onMount(() => {
    setTimeout(closeSplashscreen, 0);
    setupAppListeners(cleanupFns);
  });

  onCleanup(() => {
    for (const fn of cleanupFns) {
      fn();
    }
  });

  return (
    <>
      <HeadContent />
      <ThemeProvider>
        <LocaleProvider locale={getLocale()}>
          <Header />
          <Outlet />
          <FirmwareUpdateOverlay />
          <Toaster />
          <FirmwareUpdateStatusSync />
        </LocaleProvider>
      </ThemeProvider>
      <TanStackDevtools
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
};

const handleBeforeLoad = (): Promise<
  Awaited<ReturnType<typeof shouldRedirect>> | ReturnType<typeof redirect>
> => {
  document.documentElement.setAttribute('lang', getLocale());
  return shouldRedirect({ url: globalThis.location.href }).then((decision) => {
    if (decision.redirectUrl) {
      return redirect({ href: decision.redirectUrl.href });
    }

    return decision;
  });
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        title: m.app_title(),
      },
      {
        name: 'description',
        content: m.app_description(),
      },
    ],
  }),
  component: RootLayout,
  beforeLoad: handleBeforeLoad,
  loader: getConfig,
});
