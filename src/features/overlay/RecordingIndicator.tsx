import { Badge } from '@manafishrov/ui/badge';
import { type Component, createSignal, onCleanup, createEffect } from 'solid-js';

import * as m from '@/paraglide/messages';
import { getDuration, recordingStore } from '@/stores/recording';

const SECONDS_PER_MINUTE = 60;
const TIME_PAD_LENGTH = 2;
const MS_PER_SECOND = 1000;

const [undef] = [] as undefined[];

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
  const secs = seconds % SECONDS_PER_MINUTE;
  return `${mins.toString().padStart(TIME_PAD_LENGTH, '0')}:${secs.toString().padStart(TIME_PAD_LENGTH, '0')}`;
};

const RecordingIndicator: Component = () => {
  const [elapsed, setElapsed] = createSignal(0);

  createEffect(() => {
    if (!recordingStore.isRecording || recordingStore.startTime === undef) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor(getDuration() / MS_PER_SECOND));
    }, MS_PER_SECOND);

    onCleanup(() => {
      clearInterval(interval);
    });
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
