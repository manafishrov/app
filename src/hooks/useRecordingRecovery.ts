import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError, logInfo } from '@/lib/log';

import { configStore } from '@/stores/config';

function useRecordingRecovery() {
  const videoDirectory = useStore(
    configStore,
    (state) => state?.videoDirectory,
  );

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
}

export { useRecordingRecovery };
