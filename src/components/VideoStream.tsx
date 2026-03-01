import { useLocation } from '@tanstack/solid-router';
import { createEffect, createSignal, on, onCleanup } from 'solid-js';

import { logInfo } from '@/lib/log';
import { createWebRTCConnection, createRecording } from '@/lib/stream';
import { configStore } from '@/stores/config';
import { recordingStore, setRecordingState } from '@/stores/recording';
const VideoStream = () => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasError, setHasError] = createSignal(false);
  const location = useLocation();

  let video: HTMLVideoElement | undefined;

  const connection = createWebRTCConnection(() => video, setIsLoading, setHasError);
  const recording = createRecording(() => video);
  createEffect(
    on(
      () => [configStore.ipAddress, configStore.webrtcSignalingApiPort, configStore.webrtcSignalingApiPath] as const,
      ([ipAddress, port, path]) => {
        if (ipAddress && port && path) connection.setup();
      },
    ),
  );

  createEffect(
    on(
      () => recordingStore.isRecording,
      (current, prev) => {
        const currentBool = !!current;
        const prevBool = !!prev;
        logInfo('Recording state changed to:', currentBool, 'prev:', prevBool);
        if (currentBool && !prevBool) recording.start();
        else if (!currentBool && prevBool) recording.stop();
      },
    ),
  );

  createEffect(
    on(
      () => location().pathname,
      () => {
        if (recordingStore.isRecording) {
          recording.stop();
          setRecordingState({ isRecording: false, startTime: null });
        }
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    connection.dispose();
    if (recordingStore.isRecording) {
      recording.stop().catch(() => {});
      setRecordingState({ isRecording: false, startTime: null });
    }
  });

  return (
    <>
      <video ref={(el) => (video = el)} class='h-full w-full' autoplay playsinline muted />
      {(isLoading() || hasError()) && (
        <div class='absolute inset-0 flex items-center justify-center'>
          <div class='text-center'>
            {isLoading() ? (
              <p>Connecting to Manafish ROV camera...</p>
            ) : (
              <p>Unable to connect to ROV camera. Retrying...</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export { VideoStream };

