import { AspectRatio } from '@manafishrov/ui/aspect-ratio';
import { createFileRoute } from '@tanstack/solid-router';
import { onCleanup, onMount } from 'solid-js';

import { VideoStream } from '@/components/VideoStream';
import { createDirectionVectorLoop, createKeyboardTracker, createStateToggleLoop } from '@/input';
import { configStore, recordingStore } from '@/stores';
import { sendDirectionVector } from '@/tauri';

function Home() {
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

  return (
    <main class='flex flex-1 items-center justify-center overflow-hidden p-1 @container-[size]'>
      <AspectRatio
        ratio={4 / 3}
        class='bg-card dark relative rounded-lg w-[min(100cqw,calc(100cqh*4/3))] h-[min(100cqh,calc(100cqw*3/4))]'
      >
        <VideoStream />
      </AspectRatio>
    </main>
  );
}

export const Route = createFileRoute('/')({
  component: Home,
});
