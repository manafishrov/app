import type { Component } from 'solid-js';

import { useLocation } from '@tanstack/solid-router';

import { logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { recordingStore, setRecordingStore } from '@/stores/recording';

import { createRecording } from './recording';
import { createWebRTCConnection } from './stream';

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
        const prevBool = Boolean(prev);
        logInfo('Recording state changed to:', current, 'prev:', prevBool);
        if (current && !prevBool) {
          recording.start();
        } else if (!current && prevBool) {
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

const VideoStream: Component<{ preview?: boolean }> = (props) => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasError, setHasError] = createSignal(false);

  let video: HTMLVideoElement | undefined = undef;

  const connection = createWebRTCConnection(() => video, setIsLoading, setHasError);

  useConnectionEffect(connection);
  if (props.preview === true) {
    onCleanup(() => {
      connection.dispose();
    });
  } else {
    useRecordingEffects(
      connection,
      createRecording(() => video),
    );
  }

  return (
    <>
      <video
        ref={(el): void => {
          video = el;
        }}
        class='absolute inset-0 h-full w-full object-contain'
        autoplay
        playsinline
        muted
      />
      {(isLoading() || hasError()) && (
        <div class='absolute inset-0 flex items-center justify-center'>
          <div class='max-w-[50%] text-center text-xs text-white/50'>
            <Show
              when={props.preview === true}
              fallback={
                <p>{isLoading() ? m.video_stream_connecting() : m.video_stream_reconnecting()}</p>
              }
            >
              <p>{m.overlay_layout_offline()}</p>
              <p class='mt-1'>{m.overlay_layout_offline_hint()}</p>
            </Show>
          </div>
        </div>
      )}
    </>
  );
};

export { VideoStream };
