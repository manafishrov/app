import { onCleanup, onMount } from 'solid-js';
import { createSignal } from 'solid-js';

import { Controls } from '@/components/controls/Controls';
import { RovOverlay } from '@/components/overlay/RovOverlay';
import { VideoStream } from '@/components/VideoStream';
import { createDirectionVectorLoop, createKeyboardTracker, createStateToggleLoop } from '@/input';
import { cx } from '@/lib/utils';
import { configStore, recordingStore } from '@/stores';
import { sendDirectionVector } from '@/tauri';

export default function Home() {
  let mainRef: HTMLElement | undefined;
  const [sizeClass, setSizeClass] = createSignal<'w-full' | 'h-full'>('w-full');
  const [showControls, setShowControls] = createSignal(false);
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    const { pressedKeys, cleanup: keyboardCleanup } = createKeyboardTracker();

    const directionCleanup = createDirectionVectorLoop(
      configStore,
      pressedKeys,
      sendDirectionVector,
    );

    const stateCleanup = createStateToggleLoop(
      configStore,
      pressedKeys,
      recordingStore.isRecording,
      recordingStore.webrtcConnected,
    );

    onCleanup(() => {
      keyboardCleanup();
      directionCleanup();
      stateCleanup();
    });
  });

  const handleResize = () => {
    const mainEl = mainRef;
    if (!mainEl) return;

    const style = window.getComputedStyle(mainEl);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

    const availableWidth = mainEl.clientWidth - paddingX;
    const availableHeight = mainEl.clientHeight - paddingY;

    const potentialDivHeight = (availableWidth * 3) / 4;

    setSizeClass(potentialDivHeight > availableHeight ? 'h-full' : 'w-full');
  };

  onMount(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  return (
    <main
      ref={mainRef}
      class='flex h-full w-full items-center justify-center p-1'
      onMouseMove={handleMouseMove}
    >
      <div class={cx('bg-card dark text-foreground relative aspect-4/3 rounded-lg', sizeClass())}>
        <VideoStream />
        <RovOverlay />
        <Controls showControls={showControls()} />
      </div>
    </main>
  );
}
