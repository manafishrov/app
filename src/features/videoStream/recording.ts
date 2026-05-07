import { logError, logInfo } from '@/lib/log';
import {
  appendRecordingChunk,
  createRecordingPath,
  ensureVideoDirectory,
  handleChunkWriteOutcome,
  saveRecording,
} from '@/tauri/recording';

const RECORDING_CHUNK_MS = 1000;

type Recording = { start: () => void; stop: () => Promise<void> };
type RecordingState = {
  consecutiveChunkFailures: number;
  mediaRecorder?: MediaRecorder;
  operationId: number;
  pendingInvokes: number;
  tempFilePath?: string;
};

const ignoreRejection = (): void => {
  Number.isNaN(Number.NaN);
};
const waitForPendingInvokes = (state: RecordingState): Promise<void> =>
  new Promise<void>((resolve) => {
    const check = (): void => {
      if (state.pendingInvokes === 0) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
const hasEnabledVideoTracks = (stream: MediaStream): boolean => {
  const videoTracks = stream.getVideoTracks();
  logInfo(
    'Video tracks count:',
    videoTracks.length,
    'enabled:',
    videoTracks.map((tr) => tr.enabled),
  );
  return videoTracks.some((track: MediaStreamTrack): boolean => track.enabled);
};
const trackRecordingChunk = (state: RecordingState, event: BlobEvent): void => {
  logInfo('Recording data available, size:', event.data.size);
  const filePath = state.tempFilePath;
  if (event.data.size <= 0 || typeof filePath !== 'string' || filePath.length === 0) {
    return;
  }
  state.pendingInvokes += 1;
  event.data
    .arrayBuffer()
    .then((buffer) => appendRecordingChunk(filePath, new Uint8Array(buffer)))
    .then(
      () => {
        handleChunkWriteOutcome(state, false);
      },
      () => {
        handleChunkWriteOutcome(state, true);
      },
    )
    .finally((): void => {
      state.pendingInvokes -= 1;
    });
};
const beginRecording = (state: RecordingState, stream: MediaStream): Promise<void> => {
  if (!hasEnabledVideoTracks(stream)) {
    logError('No active video tracks available for recording');
    return Promise.resolve();
  }
  const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? { mimeType: 'video/webm;codecs=vp9,opus' }
    : undefined;
  state.mediaRecorder = new MediaRecorder(stream, options);
  return createRecordingPath().then((tempFilePath) => {
    state.tempFilePath = tempFilePath;
    if (!state.mediaRecorder) {
      return;
    }
    state.mediaRecorder.ondataavailable = (event): void => {
      trackRecordingChunk(state, event);
    };
    state.mediaRecorder.start(RECORDING_CHUNK_MS);
  });
};
const startRecording = (
  state: RecordingState,
  getVideo: () => HTMLVideoElement | undefined,
): void => {
  const video = getVideo();
  if (!video || !(video.srcObject instanceof MediaStream)) {
    return;
  }
  const stream = video.srcObject;
  state.operationId += 1;
  const currentOperationId = state.operationId;
  ensureVideoDirectory()
    .then(() => {
      if (state.operationId === currentOperationId) {
        return beginRecording(state, stream);
      }
      return;
    })
    .catch(ignoreRejection);
};
const finalizeRecording = (state: RecordingState, filePath: string | undefined): void => {
  waitForPendingInvokes(state)
    .then(() => {
      if (typeof filePath === 'string' && filePath.length > 0) {
        return saveRecording(filePath);
      }
      return;
    })
    .catch(ignoreRejection);
};
const takeActiveRecorder = (
  state: RecordingState,
): { filePath: string | undefined; recorder: MediaRecorder } | undefined => {
  if (!state.mediaRecorder) {
    return;
  }
  const recorder = state.mediaRecorder;
  const filePath = state.tempFilePath;
  delete state.mediaRecorder;
  delete state.tempFilePath;
  return { filePath, recorder };
};
const stopRecording = (state: RecordingState): Promise<void> => {
  state.operationId += 1;
  const activeRecorder = takeActiveRecorder(state);
  if (!activeRecorder) {
    return Promise.resolve();
  }
  const { filePath, recorder } = activeRecorder;
  const onStop = (): void => {
    recorder.removeEventListener('stop', onStop);
    finalizeRecording(state, filePath);
  };
  recorder.addEventListener('stop', onStop);
  recorder.stop();
  return Promise.resolve();
};

export const createRecording = (getVideo: () => HTMLVideoElement | undefined): Recording => {
  const state: RecordingState = { consecutiveChunkFailures: 0, operationId: 0, pendingInvokes: 0 };
  const start = (): void => {
    startRecording(state, getVideo);
  };
  const stop = (): Promise<void> => stopRecording(state);
  return { start, stop };
};
export type { Recording };
