import type { Component } from 'solid-js';

import { LocaleProvider, ThemeProvider } from '@manafishrov/ui';
import { Toaster } from '@manafishrov/ui/toaster';
import { TanStackDevtools } from '@tanstack/solid-devtools';
import { HeadContent, Outlet, createRootRoute, redirect } from '@tanstack/solid-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/solid-router-devtools';
import { onCleanup, onMount } from 'solid-js';

import { Header } from '@/components/Header';
import { disableContextMenu } from '@/lib/contextMenu';
import * as m from '@/paraglide/messages';
import { getLocale, shouldRedirect } from '@/paraglide/runtime';
import { getConfig, recoverTempRecordings, setupAllListeners } from '@/tauri';

const RootLayout: Component = () => {
  let cleanupFns: (() => void)[] = [];

  onMount(async () => {
    const tauriCleanup = await setupAllListeners();
    if (tauriCleanup) cleanupFns.push(tauriCleanup);

    const contextMenuCleanup = disableContextMenu();
    if (contextMenuCleanup) cleanupFns.push(contextMenuCleanup);

    await recoverTempRecordings();
  });

  onCleanup(() => {
    cleanupFns.forEach((fn) => fn());
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

const handleBeforeLoad = async () => {
  document.documentElement.setAttribute('lang', getLocale());
  const decision = await shouldRedirect({ url: globalThis.location.href });
  if (decision.redirectUrl) {
    return redirect({ href: decision.redirectUrl.href });
  }
  return decision;
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
