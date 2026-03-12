import { Badge } from '@manafishrov/ui/badge';
import { type Component, createSignal, onCleanup, createEffect } from 'solid-js';

import * as m from '@/paraglide/messages';
import { getDuration, recordingStore } from '@/stores/recording';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RecordingIndicator: Component = () => {
  const [elapsed, setElapsed] = createSignal(0);

  createEffect(() => {
    if (!recordingStore.isRecording || !recordingStore.startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor(getDuration() / 1000));
    }, 1000);

    onCleanup(() => clearInterval(interval));
  });

  return (
    <div class={recordingStore.isRecording ? 'block' : 'hidden'}>
      <Badge variant='destructive' class='bg-destructive/80 backdrop-blur-sm border-destructive'>
        <div class='bg-white h-2 w-2 animate-pulse rounded-full mr-1.5' />
        {m.overlay_recording_rec()} {formatTime(elapsed())}
      </Badge>
    </div>
  );
};

export { RecordingIndicator };
