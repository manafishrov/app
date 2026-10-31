import { RouterProvider, createRouter } from '@tanstack/solid-router';
import { render } from 'solid-js/web';

import { routeTree } from '@/routeTree.gen';
import '@/styles.css';

/**
 * No `rewrite`: with one, TanStack Router treats every non-http(s) location as
 * external, so under tauri://localhost it reloads the document instead of
 * routing and the app never renders.
 */
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 5000,
  scrollRestoration: true,
});

const rootElement = document.querySelector('#root');
if (rootElement && !rootElement.innerHTML) {
  render(() => <RouterProvider router={router} />, rootElement);
}
