import type { JSX } from 'solid-js';

import { Progress, ProgressIndicator, ProgressTrack } from '@manafishrov/ui/progress';

import type { GamepadInput } from '@/stores/config';

import { useGamepadCapture } from './capture';
import { GamepadBindActionRow, GamepadBindStats, ONE, ZERO } from './Parts';

type GamepadBindInputProps = {
  label: string;
  value: GamepadInput | null;
  resetValue: GamepadInput | null;
  selectedGamepadId: string | null;
  onChange: (next: GamepadInput | null) => void;
};

const PROGRESS_MIN_VALUE = ZERO;
const PROGRESS_MAX_VALUE = ONE;

const GamepadBindInput = (props: GamepadBindInputProps): JSX.Element => {
  const captureController = useGamepadCapture({
    value: () => props.value,
    resetValue: () => props.resetValue,
    selectedGamepadId: () => props.selectedGamepadId,
    onChange: props.onChange,
  });

  return (
    <div class='space-y-2'>
      <span>{props.label}</span>
      <GamepadBindActionRow
        isRecording={captureController.isRecording()}
        isGamepadSelected={captureController.hasGamepadSelected()}
        value={props.value}
        onStartCapture={captureController.startCapture}
        onReset={captureController.resetToDefault}
      />
      <Progress
        value={captureController.progressValue()}
        min={PROGRESS_MIN_VALUE}
        max={PROGRESS_MAX_VALUE}
      >
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <GamepadBindStats value={props.value} currentValue={captureController.currentValue()} />
    </div>
  );
};

export { GamepadBindInput };
