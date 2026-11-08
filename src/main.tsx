import { toast } from '@manafishrov/ui/toaster';
import { RouterProvider, createRouter } from '@tanstack/solid-router';
import { render } from 'solid-js/web';

import { isMobile } from '@/lib/platform';
import { routeTree } from '@/routeTree.gen';
import '@/styles.css';

// Rounded corners shape the frameless desktop window; mobile apps fill the screen.
if (isMobile) {
  document.documentElement.classList.remove('rounded-2xl');
  // In the bottom corner, toasts would cover the right joystick and table rows.
  // Centred toasts stretch between the side offsets, so keep a 24rem column.
  toast.attrs.placement = 'top';
  toast.attrs.offsets = {
    top: '1rem',
    bottom: '1rem',
    left: 'calc(50vw - 12rem)',
    right: 'calc(50vw - 12rem)',
  };
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
