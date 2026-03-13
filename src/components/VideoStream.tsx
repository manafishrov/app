import { useLocation } from '@tanstack/solid-router';
import { type Component, createSignal, createEffect, on, onCleanup } from 'solid-js';

import { logInfo } from '@/lib/log';
import { createWebRTCConnection, createRecording } from '@/lib/stream';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { recordingStore, setRecordingStore } from '@/stores/recording';

const [undef] = [] as undefined[];

const useConnectionEffect = (connection: ReturnType<typeof createWebRTCConnection>): void => {
  createEffect(
    on(
      () =>
        [
          configStore.ipAddress,
          configStore.webrtcSignalingApiPort,
          configStore.webrtcSignalingApiPath,
        ] as const,
      ([ipAddress, port, path]) => {
        if (ipAddress && port && path) {
          connection.setup();
        }
      },
    ),
  );
};

const useRecordingEffects = (
  connection: ReturnType<typeof createWebRTCConnection>,
  recording: ReturnType<typeof createRecording>,
): void => {
  const location = useLocation();

  createEffect(
    on(
      () => recordingStore.isRecording,
      (current, prev) => {
        const currentBool = Boolean(current);
        const prevBool = Boolean(prev);
        logInfo('Recording state changed to:', currentBool, 'prev:', prevBool);
        if (currentBool && !prevBool) {
          recording.start();
        } else if (!currentBool && prevBool) {
          recording.stop().catch((error: unknown) => {
            logInfo('Failed to stop recording', error);
          });
        }
      },
    ),
  );

  createEffect(
    on(
      () => location().pathname,
      () => {
        if (recordingStore.isRecording) {
          recording.stop().catch((error: unknown) => {
            logInfo('Failed to stop recording on navigation', error);
          });
          setRecordingStore({ isRecording: false, startTime: undef });
        }
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    connection.dispose();
    if (recordingStore.isRecording) {
      recording.stop().catch((error: unknown) => {
        logInfo('Failed to stop recording on cleanup', error);
      });
      setRecordingStore({ isRecording: false, startTime: undef });
    }
  });
};

const VideoStream: Component = () => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasError, setHasError] = createSignal(false);

  let video: HTMLVideoElement | undefined = undef;

  const connection = createWebRTCConnection(() => video, setIsLoading, setHasError);
  const recording = createRecording(() => video);

  useConnectionEffect(connection);
  useRecordingEffects(connection, recording);

  return (
    <>
      <video ref={(el) => (video = el)} class='h-full w-full' autoplay playsinline muted />
      {(isLoading() || hasError()) && (
        <div class='absolute inset-0 flex items-center justify-center'>
          <div class='text-center'>
            {isLoading() ? (
              <p>{m.video_stream_connecting()}</p>
            ) : (
              <p>{m.video_stream_reconnecting()}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export { VideoStream };
