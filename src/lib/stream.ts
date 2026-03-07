import { logError, logInfo } from '@/lib/log';
import { configStore } from '@/stores/config';
import { setRecordingStore } from '@/stores/recording';
import {
  appendRecordingChunk,
  createRecordingPath,
  ensureVideoDirectory,
  saveRecording,
} from '@/tauri/recording';

const RETRY_DELAY = 3000;

export type WebRTCConnection = {
  setup: () => void;
  dispose: () => void;
};

export const createWebRTCConnection = (
  getVideo: () => HTMLVideoElement | undefined,
  setIsLoading: (v: boolean) => void,
  setHasError: (v: boolean) => void,
): WebRTCConnection => {
  let peerConnection: RTCPeerConnection | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const scheduleRetry = (setup: () => void) => {
    if (retryTimeout) {clearTimeout(retryTimeout);}
    retryTimeout = setTimeout(setup, RETRY_DELAY);
  };

  const setup = async () => {
    if (disposed) {return;}

    const { ipAddress, webrtcSignalingApiPort, webrtcSignalingApiPath } = configStore;
    if (!ipAddress || !webrtcSignalingApiPort || !webrtcSignalingApiPath) {return;}

    setRecordingStore({ webrtcConnected: false });
    peerConnection?.close();
    peerConnection = new RTCPeerConnection();

    const pc = peerConnection;

    pc.ontrack = (event) => {
      if (disposed) {return;}
      logInfo('WebRTC track received, kind:', event.track.kind);
      setIsLoading(true);
      setRecordingStore({ webrtcConnected: true });
      const stream = event.streams[0];
      const video = getVideo();
      if (stream && video) {
        video.srcObject = stream;
        video.onplaying = () => {
          setIsLoading(false);
          setHasError(false);
        };
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (disposed) {return;}
      if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
        logInfo(`WebRTC connection state is ${pc.iceConnectionState}, reconnecting...`);
        setRecordingStore({ webrtcConnected: false });
        setHasError(true);
        setIsLoading(false);
        scheduleRetry(setup);
      }
    };

    pc.addTransceiver('video', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (disposed || pc !== peerConnection) {return;}

    try {
      const response = await fetch(
        `http://${ipAddress}:${webrtcSignalingApiPort}${webrtcSignalingApiPath}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp ?? '',
        },
      );

      if (disposed || pc !== peerConnection) {return;}

      if (!response.ok) {throw new Error('Failed to connect to stream');}

      await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    } catch (error) {
      if (disposed || pc !== peerConnection) {return;}
      logInfo('WebRTC connection failed, retrying in 3 seconds...', error);
      setHasError(true);
      setIsLoading(false);
      scheduleRetry(setup);
    }
  };

  const dispose = () => {
    disposed = true;
    if (retryTimeout) {clearTimeout(retryTimeout);}
    peerConnection?.close();
    peerConnection = null;
  };

  return { setup, dispose };
};

export type Recording = {
  start: () => void;
  stop: () => Promise<void>;
};

export const createRecording = (getVideo: () => HTMLVideoElement | undefined): Recording => {
  let mediaRecorder: MediaRecorder | null = null;
  let tempFilePath: string | null = null;
  let pendingInvokes = 0;
  let operationId = 0;

  const waitForPendingInvokes = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        if (pendingInvokes === 0) {resolve();}
        else {requestAnimationFrame(check);}
      };
      check();
    });

  const start = async () => {
    const video = getVideo();
    if (!video?.srcObject) {return;}

    const currentOp = ++operationId;

    await ensureVideoDirectory();
    if (currentOp !== operationId) {return;}

    const stream = video.srcObject as MediaStream;
    const videoTracks = stream.getVideoTracks();
    logInfo(
      'Video tracks count:',
      videoTracks.length,
      'enabled:',
      videoTracks.map((t) => t.enabled),
    );

    if (videoTracks.length === 0 || !videoTracks.some((t) => t.enabled)) {
      logError('No active video tracks available for recording');
      return;
    }

    mediaRecorder = new MediaRecorder(stream);
    tempFilePath = await createRecordingPath();

    mediaRecorder.ondataavailable = async (event) => {
      logInfo('Recording data available, size:', event.data.size);
      if (event.data.size > 0 && tempFilePath) {
        pendingInvokes++;
        try {
          const buffer = await event.data.arrayBuffer();
          await appendRecordingChunk(tempFilePath, new Uint8Array(buffer));
        } finally {
          pendingInvokes--;
        }
      }
    };

    mediaRecorder.start(1000);
  };

  const stop = async () => {
    ++operationId;
    if (!mediaRecorder) {return;}

    const recorder = mediaRecorder;
    const filePath = tempFilePath;
    mediaRecorder = null;
    tempFilePath = null;

    recorder.onstop = async () => {
      await waitForPendingInvokes();
      if (filePath) {
        await saveRecording(filePath);
      }
    };
    recorder.stop();
  };

  return { start: () => void start(), stop };
};
