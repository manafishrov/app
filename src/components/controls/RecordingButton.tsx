import { useStore } from '@tanstack/react-store';
import { VideoIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { recordingStore, setRecordingState } from '@/stores/recording';

function RecordingButton() {
  const { isRecording, webrtcConnected } = useStore(
    recordingStore,
    (state) => ({
      isRecording: state.isRecording,
      webrtcConnected: state.webrtcConnected,
    }),
  );

  function handleRecordingClick() {
    setRecordingState({
      isRecording: !isRecording,
      startTime: isRecording ? null : Date.now(),
    });
  }

  if (!webrtcConnected) return;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={700}>
        <TooltipTrigger asChild>
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size='icon'
            onClick={handleRecordingClick}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <VideoIcon className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='right'>
          <p>{isRecording ? 'Stop recording' : 'Start recording'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { RecordingButton };
