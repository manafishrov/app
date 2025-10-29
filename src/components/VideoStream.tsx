import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { useEffect, useRef, useState } from 'react';

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
  const recordedChunksRef = useRef<Blob[]>([]);
  const prevIsRecordingRef = useRef(false);
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

  async function startRecording() {
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

    const tempPath = await join(
      config.videoDirectory,
      `temp_recording_${Date.now()}.webm`,
    );
    tempFilePathRef.current = tempPath;

    recorder.ondataavailable = (event) => {
      logInfo('Recording data available, size:', event.data.size);
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.start();
  }

  async function stopRecording() {
    logInfo(
      'Stopping recording, current chunks:',
      recordedChunksRef.current.length,
    );
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (tempFilePathRef.current && recordedChunksRef.current.length > 0) {
      try {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm',
        });
        logInfo('Blob size:', blob.size);
        const buffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        await writeFile(tempFilePathRef.current, uint8Array);
        await invoke('save_recording', { tempPath: tempFilePathRef.current });
      } catch (error) {
        logError('Failed to save recording:', error);
        toast.error('Failed to save recording');
        setRecordingState({ isRecording: false, startTime: null });
      }
      tempFilePathRef.current = null;
      recordedChunksRef.current = [];
    } else {
      logError('No recording data captured');
      toast.error('No recording data captured');
      tempFilePathRef.current = null;
      recordedChunksRef.current = [];
    }
  }

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
  }, [isRecording]);

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
