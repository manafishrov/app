import { logError, logInfo } from '@/lib/log';
import { configStore } from '@/stores/config';
import { setRecordingStore } from '@/stores/recording';
import {
  appendRecordingChunk,
  createRecordingPath,
  ensureVideoDirectory,
  handleChunkWriteOutcome,
  saveRecording,
} from '@/tauri/recording';

const RETRY_DELAY_MS = 3000;
const RECORDING_CHUNK_MS = 1000;
const ICE_RECONNECT_STATES = new Set<RTCIceConnectionState>(['failed', 'disconnected', 'closed']);

type WebRTCConnection = { dispose: () => void; setup: () => void };
type Recording = { start: () => void; stop: () => Promise<void> };
type WebRTCState = {
  disposed: boolean;
  peerConnection?: RTCPeerConnection;
  retryTimeout?: ReturnType<typeof setTimeout>;
};
type RecordingState = {
  consecutiveChunkFailures: number;
  mediaRecorder?: MediaRecorder;
  operationId: number;
  pendingInvokes: number;
  tempFilePath?: string;
};
type UiHandlers = {
  setHasError: (hasError: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
};
type StreamOffer = { sdp: string; type: 'offer' };
type ConnectContext = {
  getVideo: () => HTMLVideoElement | undefined;
  handlers: UiHandlers;
  setup: () => void;
  state: WebRTCState;
};

const ignoreRejection = (): void => {
  Number.isNaN(Number.NaN);
};
const clearRetryTimeout = (state: WebRTCState): void => {
  if (!('retryTimeout' in state)) {
    return;
  }
  clearTimeout(state.retryTimeout);
  delete state.retryTimeout;
};
const closePeerConnection = (state: WebRTCState): void => {
  if (!('peerConnection' in state)) {
    return;
  }
  state.peerConnection.close();
  delete state.peerConnection;
};
const scheduleRetry = (state: WebRTCState, setup: () => void): void => {
  clearRetryTimeout(state);
  state.retryTimeout = setTimeout(setup, RETRY_DELAY_MS);
};
const getSignalingUrl = (): string => {
  const { ipAddress, webrtcSignalingApiPath, webrtcSignalingApiPort } = configStore;
  if (!ipAddress || !webrtcSignalingApiPort || !webrtcSignalingApiPath) {
    return '';
  }
  return `http://${ipAddress}:${webrtcSignalingApiPort}${webrtcSignalingApiPath}`;
};
const attachVideoStream = (
  getVideo: () => HTMLVideoElement | undefined,
  stream: MediaStream | undefined,
  handlers: UiHandlers,
): void => {
  const video = getVideo();
  if (!video || !stream) {
    return;
  }
  const onPlaying = (): void => {
    handlers.setIsLoading(false);
    handlers.setHasError(false);
    video.removeEventListener('playing', onPlaying);
  };
  video.srcObject = stream;
  video.addEventListener('playing', onPlaying);
};
const createOffer = (connection: RTCPeerConnection): Promise<StreamOffer> =>
  connection
    .createOffer()
    .then((offer) =>
      connection.setLocalDescription(offer).then(() => ({ sdp: offer.sdp ?? '', type: 'offer' })),
    );
const negotiateOffer = (signalingUrl: string, offer: StreamOffer): Promise<string> =>
  fetch(signalingUrl, {
    body: offer.sdp,
    headers: { 'Content-Type': 'application/sdp' },
    method: 'POST',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to connect to stream');
    }
    return response.text();
  });
const isActiveConnection = (state: WebRTCState, connection: RTCPeerConnection): boolean =>
  !state.disposed && state.peerConnection === connection;
const markDisconnected = (handlers: UiHandlers): void => {
  setRecordingStore({ webrtcConnected: false });
  handlers.setHasError(true);
  handlers.setIsLoading(false);
};
const bindConnectionEvents = (connection: RTCPeerConnection, context: ConnectContext): void => {
  const { getVideo, handlers, setup, state } = context;
  connection.ontrack = (event): void => {
    if (state.disposed) {
      return;
    }
    logInfo('WebRTC track received, kind:', event.track.kind);
    handlers.setIsLoading(true);
    setRecordingStore({ webrtcConnected: true });
    const [stream] = event.streams;
    attachVideoStream(getVideo, stream, handlers);
  };
  connection.oniceconnectionstatechange = (): void => {
    if (state.disposed || !ICE_RECONNECT_STATES.has(connection.iceConnectionState)) {
      return;
    }
    logInfo(`WebRTC connection state is ${connection.iceConnectionState}, reconnecting...`);
    markDisconnected(handlers);
    scheduleRetry(state, setup);
  };
};
const connectWebRTC = (context: ConnectContext): Promise<void> => {
  const signalingUrl = getSignalingUrl();
  if (context.state.disposed || signalingUrl.length === 0) {
    return Promise.resolve();
  }
  setRecordingStore({ webrtcConnected: false });
  closePeerConnection(context.state);
  const connection = new RTCPeerConnection();
  context.state.peerConnection = connection;
  bindConnectionEvents(connection, context);
  connection.addTransceiver('video', { direction: 'recvonly' });
  return createOffer(connection)
    .then((offer) => {
      if (!isActiveConnection(context.state, connection)) {
        return;
      }
      return negotiateOffer(signalingUrl, offer).then((answerSdp) => {
        if (isActiveConnection(context.state, connection)) {
          return connection.setRemoteDescription({ sdp: answerSdp, type: 'answer' });
        }
        return;
      });
    })
    .catch((error: unknown) => {
      if (!isActiveConnection(context.state, connection)) {
        return;
      }
      logInfo('WebRTC connection failed, retrying in 3 seconds...', error);
      markDisconnected(context.handlers);
      scheduleRetry(context.state, context.setup);
    });
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
  logInfo('Video tracks count:', videoTracks.length, 'enabled:', videoTracks.map((tr) => tr.enabled));
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
      () => { handleChunkWriteOutcome(state, false); },
      () => { handleChunkWriteOutcome(state, true); },
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
  state.mediaRecorder = new MediaRecorder(stream);
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

export const createWebRTCConnection = (
  getVideo: () => HTMLVideoElement | undefined,
  setIsLoading: (isLoading: boolean) => void,
  setHasError: (hasError: boolean) => void,
): WebRTCConnection => {
  const state: WebRTCState = { disposed: false };
  const handlers: UiHandlers = { setHasError, setIsLoading };
  const setup = (): void => {
    const context: ConnectContext = { getVideo, handlers, setup, state };
    connectWebRTC(context).catch(ignoreRejection);
  };
  const dispose = (): void => {
    state.disposed = true;
    clearRetryTimeout(state);
    closePeerConnection(state);
  };
  return { dispose, setup };
};
export const createRecording = (getVideo: () => HTMLVideoElement | undefined): Recording => {
  const state: RecordingState = { consecutiveChunkFailures: 0, operationId: 0, pendingInvokes: 0 };
  const start = (): void => {
    startRecording(state, getVideo);
  };
  const stop = (): Promise<void> => stopRecording(state);
  return { start, stop };
};
export type { Recording, WebRTCConnection };
