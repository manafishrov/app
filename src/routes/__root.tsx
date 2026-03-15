import type { Component } from 'solid-js';

import { LocaleProvider, ThemeProvider } from '@manafishrov/ui';
import { Toaster } from '@manafishrov/ui/toaster';
import { TanStackDevtools } from '@tanstack/solid-devtools';
import { HeadContent, Outlet, createRootRoute, redirect } from '@tanstack/solid-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/solid-router-devtools';

import { Header } from '@/features/header';
import { disableContextMenu } from '@/lib/contextMenu';
import * as m from '@/paraglide/messages';
import { getLocale, shouldRedirect } from '@/paraglide/runtime';
import { getConfig, recoverTempRecordings, setupAllListeners } from '@/tauri';

const RootLayout: Component = () => {
  const cleanupFns: (() => void)[] = [];

  onMount(() => {
    setupAllListeners()
      .then((tauriCleanup) => {
        cleanupFns.push(tauriCleanup);

        const contextMenuCleanup = disableContextMenu();
        if (contextMenuCleanup) {
          cleanupFns.push(contextMenuCleanup);
        }

        return recoverTempRecordings();
      })
      .catch(() => {
        const contextMenuCleanup = disableContextMenu();
        if (contextMenuCleanup) {
          cleanupFns.push(contextMenuCleanup);
        }
      });
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
