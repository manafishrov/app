import { useLocation } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { mkdir } from '@tauri-apps/plugin-fs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError, logInfo } from '@/lib/log';

import { configStore } from '@/stores/config';
import { recordingStore, setRecordingState } from '@/stores/recording';

const RETRY_DELAY = 3000;

function VideoStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tempFilePathRef = useRef<string | null>(null);
  const prevIsRecordingRef = useRef(false);
  const pendingInvokesRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const config = useStore(configStore, (state) =>
    state
      ? {
          ipAddress: state.ipAddress,
          webrtcSignalingApiPort: state.webrtcSignalingApiPort,
          webrtcSignalingApiPath: state.webrtcSignalingApiPath,
          videoDirectory: state.videoDirectory,
        }
      : null,
  );
  const isRecording = useStore(recordingStore, (state) => state.isRecording);
  const location = useLocation();

  const waitForPendingInvokes = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        if (pendingInvokesRef.current === 0) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });

  const startRecording = useCallback(async () => {
    if (!videoRef.current?.srcObject || !config) return;

    try {
      await mkdir(config.videoDirectory, { recursive: true });
    } catch (error) {
      logError('Failed to create video directory:', error);
      toast.error('Failed to start recording');
      return;
    }

    const stream = videoRef.current.srcObject as MediaStream;
    const videoTracks = stream.getVideoTracks();
    logInfo(
      'Video tracks count:',
      videoTracks.length,
      'enabled:',
      videoTracks.map((t) => t.enabled),
    );
    if (videoTracks.length === 0 || !videoTracks.some((t) => t.enabled)) {
      logError('No active video tracks available for recording');
      toast.error('No video stream available for recording');
      return;
    }

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const timestamp = new Date()
      .toISOString()
      .replace('T', '_')
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const tempPath = await join(
      config.videoDirectory,
      `Recording_${timestamp}_temp.webm`,
    );
    tempFilePathRef.current = tempPath;

    recorder.ondataavailable = async (event) => {
      logInfo('Recording data available, size:', event.data.size);
      if (event.data.size > 0 && tempFilePathRef.current) {
        pendingInvokesRef.current++;
        try {
          const buffer = await event.data.arrayBuffer();
          const chunk = Array.from(new Uint8Array(buffer));
          await invoke('append_recording_chunk', {
            tempPath: tempFilePathRef.current,
            chunk,
          });
        } finally {
          pendingInvokesRef.current--;
        }
      }
    };

    recorder.start(1000);
  }, [config]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        await waitForPendingInvokes();
        if (tempFilePathRef.current) {
          await invoke('save_recording', { tempPath: tempFilePathRef.current });
          tempFilePathRef.current = null;
        }
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  async function setupWebRTCConnection() {
    try {
      if (!config) return;
      setRecordingState({ webrtcConnected: false });

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      if (videoRef.current) {
        pc.ontrack = (event) => {
          logInfo('WebRTC track received, kind:', event.track.kind);
          setIsLoading(true);
          setRecordingState({ webrtcConnected: true });
          const stream = event.streams[0];
          if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;

            videoRef.current.onplaying = () => {
              setIsLoading(false);
              setHasError(false);
            };
          }
        };
      }

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'disconnected' ||
          pc.iceConnectionState === 'closed'
        ) {
          logInfo(
            `WebRTC connection state is ${pc.iceConnectionState}, reconnecting...`,
          );
          setRecordingState({ webrtcConnected: false });
          setHasError(true);
          setIsLoading(false);
          scheduleRetry();
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(
        `http://${config.ipAddress}:${config.webrtcSignalingApiPort}${config.webrtcSignalingApiPath}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        },
      );

      if (!response.ok) throw new Error('Failed to connect to stream');

      const answer = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer,
      });
    } catch (error) {
      logInfo('WebRTC connection failed, retrying in 3 seconds...', error);
      setHasError(true);
      setIsLoading(false);
      scheduleRetry();
    }
  }

  function scheduleRetry() {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      void setupWebRTCConnection();
    }, RETRY_DELAY);
  }

  useEffect(() => {
    void setupWebRTCConnection();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (isRecording) {
        void stopRecording();
        setRecordingState({ isRecording: false, startTime: null });
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };

    //eslint-disable-next-line react-compiler/react-compiler
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config?.ipAddress,
    config?.webrtcSignalingApiPort,
    config?.webrtcSignalingApiPath,
  ]);

  useEffect(() => {
    const prev = prevIsRecordingRef.current;
    const current = isRecording;
    logInfo('Recording state changed to:', current, 'prev:', prev);
    if (current && !prev) {
      void startRecording();
    } else if (!current && prev) {
      void stopRecording();
    }
    prevIsRecordingRef.current = current;

    //eslint-disable-next-line react-compiler/react-compiler
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      void stopRecording();
      setRecordingState({ isRecording: false, startTime: null });
    }

    //eslint-disable-next-line react-compiler/react-compiler
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      <video
        ref={videoRef}
        className='h-full w-full'
        autoPlay
        playsInline
        muted
      />
      {(isLoading || hasError) && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-center'>
            {isLoading ? (
              <p>Connecting to Manafish ROV camera...</p>
            ) : (
              <p>Unable to connect to ROV camera. Retrying...</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export { VideoStream };
