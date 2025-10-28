import { useStore } from '@tanstack/react-store';
import { useEffect, useState } from 'react';

import { recordingStore } from '@/stores/recording';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function RecordingIndicator() {
  const { isRecording, startTime } = useStore(recordingStore);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording || !startTime) {
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  if (!isRecording) return null;

  return (
    <div className='flex h-4 w-28 items-center space-x-1'>
      <div className='bg-destructive h-3 w-3 animate-pulse rounded-full' />
      <span className='text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
        REC {formatTime(elapsed)}
      </span>
    </div>
  );
}

export { RecordingIndicator };
