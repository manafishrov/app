import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';
import { useEffect } from 'react';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';
import { toast } from '@/components/ui/Toaster';

import { useConnectionStatusListener } from '@/hooks/useConnectionStatusListener';
import { useFirmwareVersionListener } from '@/hooks/useFirmwareVersionListener';
import { useGamepadListener } from '@/hooks/useGamepadListener';
import { useLogListener } from '@/hooks/useLogListener';
import { useRovStatusUpdateListener } from '@/hooks/useRovStatusUpdateListener';
import { useRovTelemetryListener } from '@/hooks/useRovTelemetryListener';
import { useToastListener } from '@/hooks/useToastListener';

import { logError, logInfo } from '@/lib/log';

import { configStore, getConfig } from '@/stores/config';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
  loader: getConfig,
});

function Root() {
  const videoDirectory = useStore(
    configStore,
    (state) => state?.videoDirectory,
  );

  useGamepadListener();
  useLogListener();
  useToastListener();
  useConnectionStatusListener();
  useRovTelemetryListener();
  useRovStatusUpdateListener();
  useFirmwareVersionListener();

  useEffect(() => {
    if (!videoDirectory) return;

    async function recoverTempFiles() {
      if (!videoDirectory) return;
      try {
        const entries = await readDir(videoDirectory);
        const tempFiles = entries
          .filter((entry) => entry.isFile && entry.name.endsWith('_temp.webm'))
          .map((entry) => entry.name);

        if (tempFiles.length > 0) {
          toast.info(
            `Recovering ${tempFiles.length} unfinished recording${tempFiles.length === 1 ? '' : 's'}...`,
          );
          logInfo('Recovering temp files:', tempFiles);

          for (const fileName of tempFiles) {
            const tempPath = await join(videoDirectory, fileName);

            await invoke('save_recording', { tempPath }).catch((err) =>
              logError('Failed to recover temp file:', fileName, err),
            );
          }
        }
      } catch (error) {
        logError('Error during temp file recovery:', error);
      }
    }

    void recoverTempFiles();
  }, [videoDirectory]);

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
