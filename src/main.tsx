import { RouterProvider, createRouter } from '@tanstack/solid-router';
import { render } from 'solid-js/web';

import { deLocalizeUrl, localizeUrl } from '@/paraglide/runtime';
import { routeTree } from '@/routeTree.gen';

import '@/styles.css';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 5000,
  scrollRestoration: true,
  rewrite: {
    input: ({ url }) => deLocalizeUrl(url),
    output: ({ url }) => localizeUrl(url),
  },
});

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.querySelector('#root');
if (rootElement && !rootElement.innerHTML) {
  render(() => <RouterProvider router={router} />, rootElement);
}
