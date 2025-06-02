import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';

import { loadConfig } from '@/stores/configStore';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  loader: async () => {
    await loadConfig();
    return null;
  },
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the Not Found Page</p>
        <Link to='/'>Start Over</Link>
      </div>
    );
  },
});

function RootComponent() {
  return (
    <>
      <ThemeProvider>
        <Outlet />
        <Toaster />
      </ThemeProvider>
      <ReactQueryDevtools buttonPosition='bottom-left' />
      <TanStackRouterDevtools position='bottom-right' />
    </>
  );
}
