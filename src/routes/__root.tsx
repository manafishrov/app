import type { Component } from 'solid-js';

import { LocaleProvider, ThemeProvider } from '@manafishrov/ui';
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
import {
  closeSplashscreen,
  getConfig,
  initializeVideoDirectory,
  recoverTempRecordings,
  setupAllListeners,
  checkForUpdates,
} from '@/tauri';

const setupAppListeners = (cleanupFns: (() => void)[]): void => {
  setupAllListeners()
    .then((tauriCleanup) => {
      cleanupFns.push(tauriCleanup);

      const contextMenuCleanup = disableContextMenu();
      if (contextMenuCleanup) {
        cleanupFns.push(contextMenuCleanup);
      }

      if (configStore.checkForUpdatesOnStartup) {
        checkForUpdates().catch(logError);
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
    closeSplashscreen();
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
