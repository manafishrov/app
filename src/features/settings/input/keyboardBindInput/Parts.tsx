import type { JSX } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import KeyboardIcon from '~icons/material-symbols/keyboard';
import RestartAltIcon from '~icons/material-symbols/restart-alt';

import type { KeyboardInput } from '@/stores/config';

import { formatKeyboardKeyLabel } from '@/input';
import * as m from '@/paraglide/messages';

type KeyboardBindActionRowProps = {
  isRecording: boolean;
  value: KeyboardInput | null;
  onStartCapture: () => void;
  onReset: () => void;
};

type KeyboardBindStatsProps = {
  value: KeyboardInput | null;
  currentValue: number;
};

const BIND_MARKER_DECIMAL_PLACES = 2;

const formatBindMarkerValue = (value: number): string => value.toFixed(BIND_MARKER_DECIMAL_PLACES);

const getCaptureButtonLabel = (isRecording: boolean, value: KeyboardInput | null): string => {
  if (isRecording) {
    return m.binding_input_press_a_key();
  }
  if (value) {
    return formatKeyboardKeyLabel(value.key);
  }
  return m.binding_input_unbound();
};

const KeyboardBindActionRow = (props: KeyboardBindActionRowProps): JSX.Element => (
  <div class='flex items-center gap-2'>
    <Button
      variant={props.isRecording ? 'destructive' : 'outline'}
      class='flex w-44 items-center justify-between gap-2'
      onClick={props.onStartCapture}
    >
      <KeyboardIcon class='size-4' />
      <span class='truncate'>{getCaptureButtonLabel(props.isRecording, props.value)}</span>
    </Button>
    <Tooltip positioning={{ placement: 'top' }}>
      <TooltipTrigger
        asChild={(tooltipProps) => (
          <Button
            {...tooltipProps()}
            variant='ghost'
            size='icon'
            aria-label={m.aria_labels_reset_to_default_binding()}
            onClick={props.onReset}
          >
            <RestartAltIcon class='size-4' />
          </Button>
        )}
      />
      <TooltipPositioner>
        <TooltipContent>
          {m.binding_input_restore_initial_binding()}
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Tooltip>
  </div>
);

const KeyboardBindStats = (props: KeyboardBindStatsProps): JSX.Element => (
  <div class='flex items-center justify-between text-xs text-muted-foreground'>
    <span>
      {m.binding_input_min()}: {props.value ? formatBindMarkerValue(props.value.minValue) : '-'}
    </span>
    <span>
      {m.binding_input_current()}: {formatBindMarkerValue(props.currentValue)}
    </span>
    <span>
      {m.binding_input_max()}: {props.value ? formatBindMarkerValue(props.value.maxValue) : '-'}
    </span>
  </div>
);

export { KeyboardBindActionRow, KeyboardBindStats };
