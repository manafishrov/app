import { join } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';

import { toast } from '@/components/ui/Toaster';
import { logError, logInfo } from '@/log';
import { configStore } from '@/stores/config';
import { invokeCommand } from '@/tauri/core';

export const recoverTempRecordings = async (): Promise<void> => {
  const videoDirectory = configStore.videoDirectory;
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

        await invokeCommand('save_recording', { tempPath }).catch((err) => {
          logError('Failed to recover temp file:', fileName, err);
        });
      }
    }
  } catch (error) {
    logError('Error during temp file recovery:', error);
  }
};

export const saveRecording = async (tempPath: string): Promise<void> => {
  await invokeCommand('save_recording', { tempPath });
};
