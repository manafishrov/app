import { RouterProvider, createRouter } from '@tanstack/solid-router';
import { render } from 'solid-js/web';

import { isMobile } from '@/lib/platform';
import { routeTree } from '@/routeTree.gen';
import '@/styles.css';

// Rounded corners shape the frameless desktop window; mobile apps fill the screen.
if (isMobile) {
  document.documentElement.classList.remove('rounded-2xl');
}

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
