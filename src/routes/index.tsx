import { cn } from '@manafishrov/ui';
import { AspectRatio } from '@manafishrov/ui/aspect-ratio';
import { createFileRoute } from '@tanstack/solid-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createSignal, onCleanup, onMount, type JSX } from 'solid-js';

import { Overlay } from '@/components/Overlay';
import { VideoStream } from '@/components/VideoStream';
import { createDirectionVectorLoop, createKeyboardTracker, createStateToggleLoop } from '@/input';
import { configStore, recordingStore } from '@/stores';
import { sendDirectionVector } from '@/tauri';

const FULLSCREEN_POLL_INTERVAL = 500;
const ASPECT_RATIO_WIDTH = 4;
const ASPECT_RATIO_HEIGHT = 3;
const ASPECT_RATIO = ASPECT_RATIO_WIDTH / ASPECT_RATIO_HEIGHT;

const INVALID_INTERVAL = -1;

const noop = function noop(): void {
  // Noop
};

const useHomePageSetup = (setIsFullscreen: (val: boolean) => void): void => {
  let keyboardCleanup: () => void = noop;
  let directionCleanup: () => void = noop;
  let stateCleanup: () => void = noop;
  let unlistenResize: () => void = noop;
  let fullscreenPollInterval = INVALID_INTERVAL;

  const syncFullscreenState = (): void => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen).catch(noop);
  };

  onMount(() => {
    const { pressedKeys, cleanup } = createKeyboardTracker();
    keyboardCleanup = cleanup;

    directionCleanup = createDirectionVectorLoop(configStore, pressedKeys, sendDirectionVector);

    stateCleanup = createStateToggleLoop(
      configStore,
      pressedKeys,
      () => recordingStore.isRecording,
      () => recordingStore.webrtcConnected,
    );

    const win = getCurrentWindow();
    syncFullscreenState();

    win
      .onResized(() => {
        syncFullscreenState();
      })
      .then((resizeCleanup) => {
        unlistenResize = resizeCleanup;
      })
      .catch(noop);

    fullscreenPollInterval = globalThis.setInterval(syncFullscreenState, FULLSCREEN_POLL_INTERVAL);
  });

  onCleanup(() => {
    keyboardCleanup();
    directionCleanup();
    stateCleanup();
    unlistenResize();

    if (fullscreenPollInterval !== INVALID_INTERVAL) {
      globalThis.clearInterval(fullscreenPollInterval);
    }
  });
};

const HomePage = (): JSX.Element => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  useHomePageSetup(setIsFullscreen);

  return (
    <main
      class={cn(
        'flex flex-1 items-center justify-center overflow-hidden p-1 @container-[size]',
        !isFullscreen() && 'mt-8',
      )}
    >
      <AspectRatio
        ratio={ASPECT_RATIO}
        class='bg-muted relative rounded-lg w-[min(100cqw,calc(100cqh*4/3))] h-[min(100cqh,calc(100cqw*3/4))]'
      >
        <VideoStream />
        <Overlay />
      </AspectRatio>
    </main>
  );
};

export const Route = createFileRoute('/')({
  component: HomePage,
});
