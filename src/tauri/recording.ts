import { toast } from '@manafishrov/ui/toaster';
import { join } from '@tauri-apps/api/path';
import { mkdir, readDir } from '@tauri-apps/plugin-fs';

import { logError, logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { setRecordingStore } from '@/stores/recording';
import { invokeCommand } from '@/tauri/core';

const TIMESTAMP_LENGTH = 19;
const MAX_CONSECUTIVE_CHUNK_FAILURES = 3;

const resolveVoid: () => void = () => 0;

const getTempFileNames = (entries: Awaited<ReturnType<typeof readDir>>): string[] =>
  entries
    .filter((entry) => entry.isFile && entry.name.endsWith('_temp.webm'))
    .map((entry) => entry.name);

const recoverTempFile = (videoDirectory: string, fileName: string): Promise<void> =>
  join(videoDirectory, fileName)
    .then((tempPath) =>
      invokeCommand('save_recording', { tempPath }).catch((error: unknown) => {
        logError('Failed to recover temp file:', fileName, error);
      }),
    )
    .then(resolveVoid);

export const ensureVideoDirectory = (): Promise<void> =>
  mkdir(configStore.videoDirectory, { recursive: true }).catch((error: unknown) => {
    logError('Failed to create video directory:', error);
    toast.create({ title: m.toasts_failed_to_start_recording(), type: 'error' });
    throw error;
  });

export const createRecordingPath = (): Promise<string> => {
  const timestamp = new Date()
    .toISOString()
    .replace('T', '_')
    .replaceAll(/[:.]/g, '-')
    .slice(0, TIMESTAMP_LENGTH);
  return join(configStore.videoDirectory, `Recording_${timestamp}_temp.webm`);
};

export const appendRecordingChunk = (tempPath: string, chunk: Uint8Array): Promise<void> =>
  invokeCommand('append_recording_chunk', { tempPath, chunk: [...chunk] })
    .catch((error: unknown) => {
      logError('Failed to append recording chunk:', error);
      const message = String(error);
      if (message.includes('Permission denied')) {
        toast.create({ title: m.toasts_recording_permission_denied(), type: 'error' });
      }
      throw error;
    })
    .then(resolveVoid);

export const handleChunkWriteOutcome = (
  state: { consecutiveChunkFailures: number },
  failed: boolean,
): void => {
  if (!failed) {
    state.consecutiveChunkFailures = 0;
    return;
  }
  state.consecutiveChunkFailures += 1;
  if (state.consecutiveChunkFailures < MAX_CONSECUTIVE_CHUNK_FAILURES) {
    return;
  }
  toast.create({ title: m.toasts_recording_stopped_due_to_errors(), type: 'error' });
  setRecordingStore({ isRecording: false });
};

export const saveRecording = (tempPath: string): Promise<void> =>
  invokeCommand('save_recording', { tempPath })
    .catch((error: unknown) => {
      logError('Failed to save recording:', error);
      toast.create({ title: m.toasts_recording_save_failed(), type: 'error' });
    })
    .then(resolveVoid);

export const recoverTempRecordings = (): Promise<void> => {
  const { videoDirectory } = configStore;
  if (!videoDirectory) {
    return Promise.resolve();
  }

  return readDir(videoDirectory)
    .then((entries) => {
      const tempFiles = getTempFileNames(entries);
      if (tempFiles.length === 0) {
        return;
      }

      toast.create({
        title: m.toasts_recovering_unfinished_recordings({ count: tempFiles.length }),
        type: 'info',
      });
      logInfo('Recovering temp files:', tempFiles);

      return Promise.all(
        tempFiles.map((fileName) => recoverTempFile(videoDirectory, fileName)),
      ).then(resolveVoid);
    })
    .catch((error: unknown) => {
      logError('Error during temp file recovery:', error);
      return;
    })
    .then(resolveVoid);
};
