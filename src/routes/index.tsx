import { cn } from '@manafishrov/ui';
import { createFileRoute } from '@tanstack/solid-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createSignal, onCleanup, onMount, type JSXElement } from 'solid-js';

import { MobileToolbar } from '@/features/header/MobileToolbar';
import { Overlay } from '@/features/overlay';
import { TouchControls } from '@/features/touchControls';
import { VideoStream } from '@/features/videoStream';
import { CameraFrame } from '@/features/videoStream/CameraFrame';
import {
  createDirectionVectorLoop,
  createKeyboardTracker,
  createStateToggleLoop,
  createTouchAxes,
  type TouchAxes,
} from '@/input';
import { isMobile } from '@/lib/platform';
import { configStore, recordingStore } from '@/stores';
import { deactivateDirectionVector, sendDirectionVector } from '@/tauri';

const FULLSCREEN_POLL_INTERVAL = 500;

const INVALID_INTERVAL = -1;
const DIRECTION_TRANSPORT = {
  deactivate: deactivateDirectionVector,
  send: sendDirectionVector,
};

const noop = function noop(): void {
  // Noop
};

const useControlInputs = (touchAxes: TouchAxes): void => {
  let keyboardCleanup: () => void = noop;
  let directionCleanup: () => void = noop;
  let stateCleanup: () => void = noop;

  onMount(() => {
    const { pressedKeys, cleanup } = createKeyboardTracker();
    keyboardCleanup = cleanup;

    directionCleanup = createDirectionVectorLoop(
      configStore,
      { pressedKeys, touchAxes },
      DIRECTION_TRANSPORT,
    );

    stateCleanup = createStateToggleLoop(
      configStore,
      pressedKeys,
      () => recordingStore.isRecording,
      () => recordingStore.webrtcConnected,
    );
  });

  onCleanup(() => {
    keyboardCleanup();
    directionCleanup();
    stateCleanup();
  });
};

const useFullscreenTracking = (setIsFullscreen: (val: boolean) => unknown): void => {
  // Mobile apps are always full screen and have no window to watch.
  if (isMobile) {
    return;
  }

  let unlistenResize: () => void = noop;
  let fullscreenPollInterval = INVALID_INTERVAL;

  const syncFullscreenState = (): void => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen).catch(noop);
  };

  onMount(() => {
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
    unlistenResize();

    if (fullscreenPollInterval !== INVALID_INTERVAL) {
      globalThis.clearInterval(fullscreenPollInterval);
    }
  });
};

const HomePage = (): JSXElement => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const touchAxes = createTouchAxes();

  useControlInputs(touchAxes);
  useFullscreenTracking(setIsFullscreen);

  return (
    <main
      class={cn(
        '@container-[size] relative flex flex-1 items-center justify-center overflow-hidden p-1',
        !isMobile && !isFullscreen() && 'mt-8',
        /* Keep the camera view clear of the touch sticks so they never cover
           instruments: beside it in landscape (phones already have room next
           to the 4:3 picture), below it on tablets Android keeps in portrait. */
        isMobile &&
          '[--stick-size:clamp(7rem,32vh,10rem)] portrait:items-start portrait:pt-[calc(3.75rem+env(safe-area-inset-top))] portrait:pb-[calc(var(--stick-size)+clamp(5rem,24vh,8rem)+2.25rem+env(safe-area-inset-bottom))] landscape:pr-[calc(var(--stick-size)+1.5rem+env(safe-area-inset-right))] landscape:pl-[calc(var(--stick-size)+1.5rem+env(safe-area-inset-left))]',
      )}
    >
      <CameraFrame class='relative h-[min(100cqh,calc(100cqw*3/4))] w-[min(100cqw,calc(100cqh*4/3))] rounded-sm'>
        <VideoStream />
        <Overlay />
      </CameraFrame>
      <Show when={isMobile}>
        <TouchControls axes={touchAxes} />
        <MobileToolbar />
      </Show>
    </main>
  );
};

export const Route = createFileRoute('/')({
  component: HomePage,
});
