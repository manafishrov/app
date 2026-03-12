import { cn } from '@manafishrov/ui';
import { AspectRatio } from '@manafishrov/ui/aspect-ratio';
import { createFileRoute } from '@tanstack/solid-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createSignal, onCleanup, onMount } from 'solid-js';

import { RovOverlay } from '@/components/overlay/RovOverlay';
import { VideoStream } from '@/components/VideoStream';
import { createDirectionVectorLoop, createKeyboardTracker, createStateToggleLoop } from '@/input';
import { configStore, recordingStore } from '@/stores';
import { sendDirectionVector } from '@/tauri';

function HomePage() {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  let keyboardCleanup: (() => void) | undefined;
  let directionCleanup: (() => void) | undefined;
  let stateCleanup: (() => void) | undefined;
  let unlistenResize: (() => void) | undefined;
  let fullscreenPollInterval: number | undefined;

  const syncFullscreenState = (): void => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen);
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
      });

    fullscreenPollInterval = globalThis.setInterval(syncFullscreenState, 500);
  });

  onCleanup(() => {
    keyboardCleanup?.();
    directionCleanup?.();
    stateCleanup?.();
    unlistenResize?.();

    if (fullscreenPollInterval !== undefined) {
      globalThis.clearInterval(fullscreenPollInterval);
    }
  });

  return (
    <main
      class={cn(
        'flex flex-1 items-center justify-center overflow-hidden p-1 @container-[size]',
        !isFullscreen() && 'mt-8',
      )}
    >
      <AspectRatio
        ratio={4 / 3}
        class='bg-muted relative rounded-lg w-[min(100cqw,calc(100cqh*4/3))] h-[min(100cqh,calc(100cqw*3/4))]'
      >
        <VideoStream />
        <RovOverlay />
      </AspectRatio>
    </main>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
