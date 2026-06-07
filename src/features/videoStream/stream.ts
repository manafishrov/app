import { logInfo } from '@/lib/log';
import { configStore } from '@/stores/config';
import { setRecordingStore } from '@/stores/recording';

const RETRY_DELAY_MS = 3000;
const ICE_RECONNECT_STATES = new Set<RTCIceConnectionState>(['failed', 'disconnected', 'closed']);

type WebRTCConnection = { dispose: () => void; setup: () => void };
type WebRTCState = {
  disposed: boolean;
  peerConnection?: RTCPeerConnection;
  retryTimeout?: ReturnType<typeof setTimeout>;
};
type UiHandlers = {
  setHasError: (hasError: boolean) => unknown;
  setIsLoading: (isLoading: boolean) => unknown;
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
// Pin the offer to one H.264 codec; WebKitGTK drops RTP when it offers several.
const selectH264Codec = (codecs: RTCRtpCodec[]): RTCRtpCodec | undefined => {
  const h264 = codecs.filter((codec) => codec.mimeType.toLowerCase() === 'video/h264');
  const preferred = h264.find((codec) =>
    (codec.sdpFmtpLine ?? '').includes('packetization-mode=1'),
  );
  return preferred ?? h264[0];
};
const preferH264 = (transceiver: RTCRtpTransceiver): void => {
  if (
    typeof RTCRtpReceiver.getCapabilities !== 'function' ||
    typeof transceiver.setCodecPreferences !== 'function'
  ) {
    return;
  }
  const capabilities = RTCRtpReceiver.getCapabilities('video');
  if (!capabilities) {
    return;
  }
  const codec = selectH264Codec(capabilities.codecs);
  if (codec) {
    transceiver.setCodecPreferences([codec]);
  }
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
const createPeerConnection = (context: ConnectContext): RTCPeerConnection => {
  // `max-bundle`: WebKitGTK does not implement the default `balanced` policy.
  const connection = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
  context.state.peerConnection = connection;
  bindConnectionEvents(connection, context);
  const transceiver = connection.addTransceiver('video', { direction: 'recvonly' });
  preferH264(transceiver);
  return connection;
};
const connectWebRTC = (context: ConnectContext): Promise<void> => {
  const signalingUrl = getSignalingUrl();
  if (context.state.disposed || signalingUrl.length === 0) {
    return Promise.resolve();
  }
  setRecordingStore({ webrtcConnected: false });
  closePeerConnection(context.state);
  const connection = createPeerConnection(context);
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
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      logInfo('WebRTC connection failed, retrying in 3 seconds...', detail);
      markDisconnected(context.handlers);
      scheduleRetry(context.state, context.setup);
    });
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
export type { WebRTCConnection };
