import type { Component } from 'solid-js';

import { LocaleProvider, ThemeProvider } from '@manafishrov/ui';
import { Toaster } from '@manafishrov/ui/toaster';
import { TanStackDevtools } from '@tanstack/solid-devtools';
import { HeadContent, Outlet, createRootRoute } from '@tanstack/solid-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/solid-router-devtools';

import { CompatibilityWarningAlertDialog } from '@/features/compatibility/CompatibilityWarningAlertDialog';
import { Header } from '@/features/header';
import { loadCompatibility } from '@/lib/compatibility';
import { disableContextMenu } from '@/lib/contextMenu';
import { logError } from '@/lib/log';
import { disablePageZoom } from '@/lib/pageZoom';
import * as m from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { configStore } from '@/stores/config';
import {
  checkForAppUpdates,
  closeSplashscreen,
  getConfig,
  initializeVideoDirectory,
  isUpdaterEnabled,
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

      if (isUpdaterEnabled && configStore.checkForAppUpdatesOnStartup) {
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

const RootLayout: Component = () => {
  const cleanupFns: (() => void)[] = [];

  onMount(() => {
    cleanupFns.push(disablePageZoom());
    setTimeout(closeSplashscreen, 0);
    loadCompatibility().catch(logError);
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
          <Toaster />
          <CompatibilityWarningAlertDialog />
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

const handleBeforeLoad = (): void => {
  document.documentElement.setAttribute('lang', getLocale());
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
