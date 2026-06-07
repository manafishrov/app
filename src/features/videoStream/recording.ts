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

/*
 * Prefer H.264: the ROV stream is H.264 and the saved file is MP4, so recording
 * H.264 lets the Rust converter stream-copy it (no re-encode, no quality loss)
 * and it plays everywhere. VP8/VP9 in MP4 is non-standard, and WebKitGTK reports
 * VP9 as supported while being unable to encode it, producing empty files.
 */
const RECORDING_MIME_TYPES = [
  'video/mp4;codecs=avc1',
  'video/x-matroska;codecs=avc1',
  'video/webm;codecs=h264',
  'video/webm;codecs=vp8',
  'video/webm',
];
const createMediaRecorder = (stream: MediaStream): MediaRecorder => {
  const mimeType = RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (typeof mimeType === 'string') {
    return new MediaRecorder(stream, { mimeType });
  }
  return new MediaRecorder(stream);
};

const beginRecording = (state: RecordingState, stream: MediaStream): Promise<void> => {
  if (!hasEnabledVideoTracks(stream)) {
    logError('No active video tracks available for recording');
    return Promise.resolve();
  }
  state.mediaRecorder = createMediaRecorder(stream);
  return createRecordingPath(state.mediaRecorder.mimeType).then((tempFilePath) => {
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
  // Keep `state.tempFilePath` so the final `dataavailable` from `stop()` is not dropped.
  delete state.mediaRecorder;
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
    delete state.tempFilePath;
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
