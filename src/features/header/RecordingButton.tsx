import type { JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
  TooltipArrow,
} from '@manafishrov/ui/tooltip';
import VideoIcon from '~icons/material-symbols/video-camera-back';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { recordingStore, setRecordingStore } from '@/stores/recording';
import { playConfirmHaptic } from '@/tauri/gamepad';

import { headerButtonSize } from './buttonSize';

const [undef] = [] as (number | undefined)[];

const handleRecordingClick = (): void => {
  const { isRecording } = recordingStore;
  playConfirmHaptic(configStore.selectedGamepadId);
  setRecordingStore({
    isRecording: !isRecording,
    startTime: isRecording ? undef : Date.now(),
  });
};

const RecordingButton = (): JSXElement => (
  <Show when={recordingStore.webrtcConnected}>
    <Tooltip positioning={{ placement: 'bottom' }}>
      <TooltipTrigger
        tabIndex={-1}
        asChild={(props) => (
          <Button
            {...props()}
            size={headerButtonSize}
            variant={recordingStore.isRecording ? 'destructive' : 'outline'}
            onClick={handleRecordingClick}
            aria-label={
              recordingStore.isRecording
                ? m.controls_recording_stop_recording()
                : m.controls_recording_start_recording()
            }
          >
            <VideoIcon />
          </Button>
        )}
      />
      <TooltipPositioner>
        <TooltipContent>
          <span>
            {recordingStore.isRecording
              ? m.controls_recording_stop_recording()
              : m.controls_recording_start_recording()}
          </span>
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Tooltip>
  </Show>
);

export { RecordingButton };
