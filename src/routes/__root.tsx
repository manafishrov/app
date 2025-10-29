import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';

import { useConnectionStatusListener } from '@/hooks/useConnectionStatusListener';
import { useFirmwareVersionListener } from '@/hooks/useFirmwareVersionListener';
import { useGamepadListener } from '@/hooks/useGamepadListener';
import { useLogListener } from '@/hooks/useLogListener';
import { useRecordingRecovery } from '@/hooks/useRecordingRecovery';
import { useRovStatusUpdateListener } from '@/hooks/useRovStatusUpdateListener';
import { useRovTelemetryListener } from '@/hooks/useRovTelemetryListener';
import { useToastListener } from '@/hooks/useToastListener';

import { getConfig } from '@/stores/config';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
  loader: getConfig,
});

function Root() {
  useGamepadListener();
  useLogListener();
  useToastListener();
  useConnectionStatusListener();
  useRovTelemetryListener();
  useRovStatusUpdateListener();
  useFirmwareVersionListener();
  useRecordingRecovery();

  return (
    <>
      <ThemeProvider>
        <Outlet />
        <Toaster />
      </ThemeProvider>
      <ReactQueryDevtools buttonPosition='bottom-right' />
      <TanStackRouterDevtools position='bottom-right' />
    </>
  );
}
