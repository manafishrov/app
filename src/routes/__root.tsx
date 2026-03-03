import { LocaleProvider, ThemeProvider } from '@manafishrov/ui';
import { Toaster } from '@manafishrov/ui/toaster';
import { HeadContent, Outlet, createRootRoute, redirect } from '@tanstack/solid-router';
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools';
import { type Component } from 'solid-js';

import * as m from '@/paraglide/messages';
import { getLocale, shouldRedirect } from '@/paraglide/runtime';
import { getConfig } from '@/stores/config';
import { recoverTempRecordings, setupAllListeners } from '@/tauri';

const RootComponent: Component = () => {
  onMount(async () => {
    const cleanup = await setupAllListeners();
    await recoverTempRecordings();

    return cleanup;
  });

  return (
    <>
      <HeadContent />
      <TanStackRouterDevtools position='bottom-right' />
      <ThemeProvider>
        <LocaleProvider locale={getLocale()}>
          <Outlet />
          <Toaster />
        </LocaleProvider>
      </ThemeProvider>
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
  component: RootComponent,
  beforeLoad: handleBeforeLoad,
  loader: getConfig,
});
