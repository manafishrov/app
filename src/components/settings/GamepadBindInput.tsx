import { Button } from '@manafishrov/ui/button';
import { Progress, ProgressIndicator, ProgressTrack } from '@manafishrov/ui/progress';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { createSignal, onCleanup, onMount } from 'solid-js';
import RestartAltIcon from '~icons/material-symbols/restart-alt';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import type { GamepadInput } from '@/stores/config';

import {
  BIND_CAPTURE_SETTLE_MS,
  BIND_CAPTURE_TIMEOUT_MS,
  GAMEPAD_CAPTURE_THRESHOLD,
  formatGamepadInputLabel,
  getActiveGamepad,
  getGamepadRawInputValue,
  normalizeBindValue,
  roundToBindIncrement,
} from '@/input';

type GamepadBindInputProps = {
  label: string;
  value: GamepadInput | null;
  resetValue: GamepadInput | null;
  selectedGamepadId: string | null;
  onChange: (next: GamepadInput | null) => void;
};

type GamepadSnapshot = {
  buttons: number[];
  axes: number[];
};

type ChangedInput = {
  input: GamepadInput['input'];
};

const snapshotGamepad = (gamepad: Gamepad): GamepadSnapshot => {
  return {
    buttons: gamepad.buttons.map((button) => button?.value ?? 0),
    axes: [...gamepad.axes],
  };
};

const detectChangedInput = (
  initial: GamepadSnapshot,
  latest: GamepadSnapshot,
): ChangedInput | null => {
  for (let index = 0; index < latest.buttons.length; index += 1) {
    const startValue = initial.buttons[index] ?? 0;
    const endValue = latest.buttons[index] ?? 0;
    const delta = Math.abs(endValue - startValue);

    if (delta < GAMEPAD_CAPTURE_THRESHOLD) continue;

    return {
      input: { Button: index },
    };
  }

  for (let index = 0; index < latest.axes.length; index += 1) {
    const startValue = initial.axes[index] ?? 0;
    const endValue = latest.axes[index] ?? 0;
    const delta = Math.abs(endValue - startValue);

    if (delta < GAMEPAD_CAPTURE_THRESHOLD) continue;

    return {
      input: { Axis: index },
    };
  }

  return null;
};

function GamepadBindInput(props: GamepadBindInputProps) {
  const [isRecording, setIsRecording] = createSignal(false);
  const [progressValue, setProgressValue] = createSignal(0);
  const [currentValue, setCurrentValue] = createSignal(0);
  let animationFrame: number | undefined;
  let captureTimeout: number | undefined;
  let settleTimeout: number | undefined;
  let initialSnapshot: GamepadSnapshot | null = null;
  let changedInput: GamepadInput['input'] | null = null;
  let escapeListener: ((event: KeyboardEvent) => void) | null = null;

  const getSnapshotRawInputValue = (
    snapshot: GamepadSnapshot,
    input: GamepadInput['input'],
  ): number => {
    if ('Button' in input) {
      return snapshot.buttons[input.Button] ?? 0;
    }

    return snapshot.axes[input.Axis] ?? 0;
  };

  const stopRecording = (): void => {
    if (captureTimeout !== undefined) {
      window.clearTimeout(captureTimeout);
      captureTimeout = undefined;
    }

    if (settleTimeout !== undefined) {
      window.clearTimeout(settleTimeout);
      settleTimeout = undefined;
    }

    if (escapeListener) {
      window.removeEventListener('keydown', escapeListener);
      escapeListener = null;
    }

    initialSnapshot = null;
    changedInput = null;
    setIsRecording(false);
  };

  onMount(() => {
    const updateProgress = (): void => {
      const gamepad = getActiveGamepad(props.selectedGamepadId);
      if (!gamepad) {
        setProgressValue(0);
        setCurrentValue(0);
      } else {
        const rawValue = getGamepadRawInputValue(props.value?.input ?? null, gamepad);
        setCurrentValue(rawValue);
        setProgressValue(
          props.value
            ? normalizeBindValue(rawValue, props.value.minValue, props.value.maxValue)
            : 0,
        );

        if (isRecording() && initialSnapshot && !changedInput) {
          const latestSnapshot = snapshotGamepad(gamepad);
          const detected = detectChangedInput(initialSnapshot, latestSnapshot);

          if (detected) {
            changedInput = detected.input;

            settleTimeout = window.setTimeout(() => {
              const finalGamepad = getActiveGamepad(props.selectedGamepadId);

              if (finalGamepad && initialSnapshot && changedInput) {
                const minValue = roundToBindIncrement(
                  getSnapshotRawInputValue(initialSnapshot, changedInput),
                );
                const maxValue = roundToBindIncrement(
                  getGamepadRawInputValue(changedInput, finalGamepad),
                );

                props.onChange({
                  input: changedInput,
                  minValue,
                  maxValue,
                });
              }

              stopRecording();
            }, BIND_CAPTURE_SETTLE_MS);
          }
        }
      }

      animationFrame = window.requestAnimationFrame(updateProgress);
    };

    animationFrame = window.requestAnimationFrame(updateProgress);
  });

  onCleanup(() => {
    if (animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame);
    }

    stopRecording();
  });

  const formatBindMarkerValue = (value: number): string => {
    return value.toFixed(2);
  };

  const startCapture = (): void => {
    if (isRecording()) return;

    const gamepad = getActiveGamepad(props.selectedGamepadId);
    if (!gamepad) return;

    escapeListener = (event: KeyboardEvent): void => {
      if (event.code !== 'Escape') return;
      props.onChange(null);
      stopRecording();
    };
    window.addEventListener('keydown', escapeListener);

    initialSnapshot = snapshotGamepad(gamepad);
    changedInput = null;
    setIsRecording(true);

    captureTimeout = window.setTimeout(() => {
      stopRecording();
    }, BIND_CAPTURE_TIMEOUT_MS);
  };

  const resetToDefault = (): void => {
    stopRecording();

    if (props.resetValue) {
      props.onChange({
        input: props.resetValue.input,
        minValue: roundToBindIncrement(props.resetValue.minValue),
        maxValue: roundToBindIncrement(props.resetValue.maxValue),
      });
      return;
    }

    props.onChange(null);
  };

  return (
    <div class='space-y-2'>
      <span>{props.label}</span>
      <div class='flex items-center gap-2'>
        <Button
          variant={isRecording() ? 'destructive' : 'outline'}
          class='flex w-44 items-center justify-between gap-2'
          onClick={startCapture}
          disabled={!props.selectedGamepadId}
        >
          <SportsEsportsIcon class='size-4' />
          <span class='truncate'>
            {isRecording()
              ? 'Move a control...'
              : formatGamepadInputLabel(props.value?.input ?? null)}
          </span>
        </Button>
        <Tooltip positioning={{ placement: 'top' }}>
          <TooltipTrigger
            asChild={(tooltipProps) => (
              <Button
                {...tooltipProps()}
                variant='ghost'
                size='icon'
                aria-label='Reset binding'
                onClick={resetToDefault}
                disabled={!props.selectedGamepadId}
              >
                <RestartAltIcon class='size-4' />
              </Button>
            )}
          />
          <TooltipPositioner>
            <TooltipContent>
              Restore initial binding
              <TooltipArrow />
            </TooltipContent>
          </TooltipPositioner>
        </Tooltip>
      </div>
      <Progress value={progressValue()} min={0} max={1}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <div class='flex items-center justify-between text-xs text-muted-foreground'>
        <span>Min: {props.value ? formatBindMarkerValue(props.value.minValue) : '-'}</span>
        <span>Current: {formatBindMarkerValue(currentValue())}</span>
        <span>Max: {props.value ? formatBindMarkerValue(props.value.maxValue) : '-'}</span>
      </div>
    </div>
  );
}

export { GamepadBindInput };
