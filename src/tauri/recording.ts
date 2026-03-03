import { toast } from '@manafishrov/ui/toaster';
import { join } from '@tauri-apps/api/path';
import { mkdir, readDir } from '@tauri-apps/plugin-fs';

import { logError, logInfo } from '@/lib/log';
import { configStore } from '@/stores/config';
import { invokeCommand } from '@/tauri/core';

export const ensureVideoDirectory = async (): Promise<void> => {
  try {
    await mkdir(configStore.videoDirectory, { recursive: true });
  } catch (error) {
    logError('Failed to create video directory:', error);
    toast.create({ title: 'Failed to start recording', type: 'error' });
    throw error;
  }
};

export const createRecordingPath = async (): Promise<string> => {
  const timestamp = new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-').slice(0, 19);
  return join(configStore.videoDirectory, `Recording_${timestamp}_temp.webm`);
};

export const appendRecordingChunk = async (tempPath: string, chunk: Uint8Array): Promise<void> => {
  try {
    await invokeCommand('append_recording_chunk', { tempPath, chunk: Array.from(chunk) });
  } catch (error) {
    logError('Failed to append recording chunk:', error);
  }
};

export const saveRecording = async (tempPath: string): Promise<void> => {
  try {
    await invokeCommand('save_recording', { tempPath });
  } catch (error) {
    logError('Failed to save recording:', error);
    toast.create({ title: 'Failed to save recording', type: 'error' });
  }
};

export const recoverTempRecordings = async (): Promise<void> => {
  const videoDirectory = configStore.videoDirectory;
  if (!videoDirectory) return;

  try {
    const entries = await readDir(videoDirectory);
    const tempFiles = entries
      .filter((entry) => entry.isFile && entry.name.endsWith('_temp.webm'))
      .map((entry) => entry.name);

    if (tempFiles.length > 0) {
      toast.create({
        title: `Recovering ${tempFiles.length} unfinished recording${tempFiles.length === 1 ? '' : 's'}...`,
        type: 'info',
      });
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
