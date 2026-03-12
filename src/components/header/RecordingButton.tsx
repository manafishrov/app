import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
  TooltipArrow,
} from '@manafishrov/ui/tooltip';
import VideoIcon from '~icons/material-symbols/video-camera-back';

import { recordingStore, setRecordingStore } from '@/stores/recording';

function RecordingButton() {
  const handleRecordingClick = () => {
    const isRecording = recordingStore.isRecording;
    setRecordingStore({
      isRecording: !isRecording,
      startTime: isRecording ? null : Date.now(),
    });
  };

  return (
    <Show when={recordingStore.webrtcConnected}>
      <Tooltip positioning={{ placement: 'bottom' }}>
        <TooltipTrigger
          tabIndex={-1}
          asChild={(props) => (
            <Button
              {...props()}
              size='icon-xs'
              variant={recordingStore.isRecording ? 'destructive' : 'outline'}
              onClick={handleRecordingClick}
              aria-label={recordingStore.isRecording ? 'Stop recording' : 'Start recording'}
            >
              <VideoIcon />
            </Button>
          )}
        />
        <TooltipPositioner>
          <TooltipContent>
            <span>{recordingStore.isRecording ? 'Stop recording' : 'Start recording'}</span>
            <TooltipArrow />
          </TooltipContent>
        </TooltipPositioner>
      </Tooltip>
    </Show>
  );
}

export { RecordingButton };
