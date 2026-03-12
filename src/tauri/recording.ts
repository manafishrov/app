import { toast } from '@manafishrov/ui/toaster';
import { join } from '@tauri-apps/api/path';
import { mkdir, readDir } from '@tauri-apps/plugin-fs';

import { logError, logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { invokeCommand } from '@/tauri/core';

export const ensureVideoDirectory = async (): Promise<void> => {
  try {
    await mkdir(configStore.videoDirectory, { recursive: true });
  } catch (error) {
    logError('Failed to create video directory:', error);
    toast.create({ title: m.toasts_failed_to_start_recording(), type: 'error' });
    throw error;
  }
};

export const createRecordingPath = async (): Promise<string> => {
  const timestamp = new Date()
    .toISOString()
    .replace('T', '_')
    .replaceAll(/[:.]/g, '-')
    .slice(0, 19);
  return join(configStore.videoDirectory, `Recording_${timestamp}_temp.webm`);
};

export const appendRecordingChunk = async (tempPath: string, chunk: Uint8Array): Promise<void> => {
  try {
    await invokeCommand('append_recording_chunk', { tempPath, chunk: [...chunk] });
  } catch (error) {
    logError('Failed to append recording chunk:', error);
  }
};

export const saveRecording = async (tempPath: string): Promise<void> => {
  try {
    await invokeCommand('save_recording', { tempPath });
  } catch (error) {
    logError('Failed to save recording:', error);
    toast.create({ title: m.toasts_recording_save_failed(), type: 'error' });
  }
};

export const recoverTempRecordings = async (): Promise<void> => {
  const { videoDirectory } = configStore;
  if (!videoDirectory) {
    return;
  }

  try {
    const entries = await readDir(videoDirectory);
    const tempFiles = entries
      .filter((entry) => entry.isFile && entry.name.endsWith('_temp.webm'))
      .map((entry) => entry.name);

    if (tempFiles.length > 0) {
      toast.create({
        title: m.toasts_recovering_unfinished_recordings({ count: tempFiles.length }),
        type: 'info',
      });
      logInfo('Recovering temp files:', tempFiles);

      for (const fileName of tempFiles) {
        const tempPath = await join(videoDirectory, fileName);
        await invokeCommand('save_recording', { tempPath }).catch((error) => {
          logError('Failed to recover temp file:', fileName, error);
        });
      }
    }
  } catch (error) {
    logError('Error during temp file recovery:', error);
  }
};
