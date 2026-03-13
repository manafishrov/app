import type { JSX } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import RestartAltIcon from '~icons/material-symbols/restart-alt';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import type { GamepadInput } from '@/stores/config';

import { formatGamepadInputLabel } from '@/input';
import * as m from '@/paraglide/messages';

type GamepadBindActionRowProps = {
  isRecording: boolean;
  isGamepadSelected: boolean;
  value: GamepadInput | null;
  onStartCapture: () => void;
  onReset: () => void;
};

type GamepadBindStatsProps = {
  value: GamepadInput | null;
  currentValue: number;
};

const ZERO = 0;
const ONE = 1;
const BIND_MARKER_DECIMAL_PLACES = 2;

const NULL_TAG = '[object Null]';

const isNullValue = (value: unknown): value is null =>
  Object.prototype.toString.call(value) === NULL_TAG;

const parsedUnboundInput: unknown = JSON.parse('null');

if (!isNullValue(parsedUnboundInput)) {
  throw new Error('Expected parsed unbound gamepad input to be null.');
}

const getUnboundGamepadInputType = (): GamepadInput['input'] | null => parsedUnboundInput;

const formatBindMarkerValue = (value: number): string => value.toFixed(BIND_MARKER_DECIMAL_PLACES);

const getCaptureButtonLabel = (isRecording: boolean, value: GamepadInput | null): string => {
  if (isRecording) {
    return m.binding_input_move_a_control();
  }
  if (value) {
    return formatGamepadInputLabel(value.input);
  }
  return formatGamepadInputLabel(getUnboundGamepadInputType());
};

const getMarkerLabel = (value: GamepadInput | null, marker: 'min' | 'max'): string => {
  if (!value) {
    return '-';
  }
  if (marker === 'min') {
    return formatBindMarkerValue(value.minValue);
  }
  return formatBindMarkerValue(value.maxValue);
};

const GamepadBindActionRow = (props: GamepadBindActionRowProps): JSX.Element => (
  <div class='flex items-center gap-2'>
    <Button
      variant={props.isRecording ? 'destructive' : 'outline'}
      class='flex w-44 items-center justify-between gap-2'
      onClick={props.onStartCapture}
      disabled={!props.isGamepadSelected}
    >
      <SportsEsportsIcon class='size-4' />
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
            disabled={!props.isGamepadSelected}
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

const GamepadBindStats = (props: GamepadBindStatsProps): JSX.Element => (
  <div class='flex items-center justify-between text-xs text-muted-foreground'>
    <span>
      {m.binding_input_min()}: {getMarkerLabel(props.value, 'min')}
    </span>
    <span>
      {m.binding_input_current()}: {formatBindMarkerValue(props.currentValue)}
    </span>
    <span>
      {m.binding_input_max()}: {getMarkerLabel(props.value, 'max')}
    </span>
  </div>
);

export { GamepadBindActionRow, GamepadBindStats, ONE, ZERO };
