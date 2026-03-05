import { Button } from '@manafishrov/ui/button';
import { Progress, ProgressIndicator, ProgressTrack } from '@manafishrov/ui/progress';
import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import KeyboardIcon from '~icons/material-symbols/keyboard';
import RestartAltIcon from '~icons/material-symbols/restart-alt';

import type { KeyboardInput, KeyboardKey } from '@/stores/config';

import {
  BIND_CAPTURE_SETTLE_MS,
  BIND_CAPTURE_TIMEOUT_MS,
  formatKeyboardKeyLabel,
  isKeyboardKey,
  normalizeBindValue,
} from '@/input';

type KeyboardBindInputProps = {
  label: string;
  value: KeyboardInput;
  defaultValue: KeyboardInput;
  onChange: (next: KeyboardInput) => void;
};

const toKeyboardValue = (isPressed: boolean): number => {
  return isPressed ? 1 : 0;
};

function KeyboardBindInput(props: KeyboardBindInputProps) {
  const [pressedKeys, setPressedKeys] = createSignal<Set<string>>(new Set<string>());
  const [isRecording, setIsRecording] = createSignal(false);
  let captureTimeout: number | undefined;
  let settleTimeout: number | undefined;
  let captureFirstKeyDownListener: ((event: KeyboardEvent) => void) | null = null;
  let captureFirstKeyUpListener: ((event: KeyboardEvent) => void) | null = null;

  const stopRecording = (): void => {
    if (captureTimeout !== undefined) {
      window.clearTimeout(captureTimeout);
      captureTimeout = undefined;
    }

    if (settleTimeout !== undefined) {
      window.clearTimeout(settleTimeout);
      settleTimeout = undefined;
    }

    if (captureFirstKeyDownListener) {
      window.removeEventListener('keydown', captureFirstKeyDownListener);
      captureFirstKeyDownListener = null;
    }

    if (captureFirstKeyUpListener) {
      window.removeEventListener('keyup', captureFirstKeyUpListener);
      captureFirstKeyUpListener = null;
    }

    setIsRecording(false);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    setPressedKeys((prev) => {
      if (prev.has(event.code)) return prev;
      const next = new Set<string>(prev);
      next.add(event.code);
      return next;
    });
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    setPressedKeys((prev) => {
      if (!prev.has(event.code)) return prev;
      const next = new Set<string>(prev);
      next.delete(event.code);
      return next;
    });
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) {
      setPressedKeys(new Set<string>());
    }
  };

  onMount(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVisibilityChange);

    stopRecording();
  });

  const progressValue = createMemo(() => {
    const key = props.value.key;
    const mappedValue = pressedKeys().has(key) ? props.value.maxValue : props.value.minValue;
    return normalizeBindValue(mappedValue, props.value.minValue, props.value.maxValue);
  });

  const formatBindMarkerValue = (value: number): string => {
    return value.toFixed(2);
  };

  const startCapture = (): void => {
    if (isRecording()) return;

    const initialSnapshot = new Set(pressedKeys());
    let firstChangedKey: string | null = null;
    let settleScheduled = false;

    const scheduleSecondSnapshot = (): void => {
      if (settleScheduled || !firstChangedKey) return;
      settleScheduled = true;

      settleTimeout = window.setTimeout(() => {
        const latestSnapshot = new Set(pressedKeys());
        const changedKey = firstChangedKey;

        if (changedKey && isKeyboardKey(changedKey)) {
          props.onChange({
            key: changedKey as KeyboardKey,
            minValue: toKeyboardValue(initialSnapshot.has(changedKey)),
            maxValue: toKeyboardValue(latestSnapshot.has(changedKey)),
          });
        }

        stopRecording();
      }, BIND_CAPTURE_SETTLE_MS);
    };

    captureFirstKeyDownListener = (event: KeyboardEvent): void => {
      if (!firstChangedKey && !initialSnapshot.has(event.code)) {
        firstChangedKey = event.code;
        scheduleSecondSnapshot();
      }
    };

    captureFirstKeyUpListener = (event: KeyboardEvent): void => {
      if (!firstChangedKey && initialSnapshot.has(event.code)) {
        firstChangedKey = event.code;
        scheduleSecondSnapshot();
      }
    };

    window.addEventListener('keydown', captureFirstKeyDownListener);
    window.addEventListener('keyup', captureFirstKeyUpListener);

    setIsRecording(true);

    captureTimeout = window.setTimeout(() => {
      stopRecording();
    }, BIND_CAPTURE_TIMEOUT_MS);
  };

  const resetToDefault = (): void => {
    stopRecording();

    props.onChange({
      key: props.defaultValue.key,
      minValue: props.defaultValue.minValue,
      maxValue: props.defaultValue.maxValue,
    });
  };

  return (
    <div class='space-y-2'>
      <span>{props.label}</span>
      <div class='flex items-center gap-2'>
        <Button
          variant={isRecording() ? 'destructive' : 'outline'}
          class='flex w-44 items-center justify-between gap-2'
          onClick={startCapture}
        >
          <KeyboardIcon class='size-4' />
          <span class='truncate'>
            {isRecording() ? 'Press a key...' : formatKeyboardKeyLabel(props.value.key)}
          </span>
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Reset to default binding'
          onClick={resetToDefault}
        >
          <RestartAltIcon class='size-4' />
        </Button>
      </div>
      <Progress value={progressValue()} min={0} max={1}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <div class='flex items-center justify-between text-xs text-muted-foreground'>
        <span>Min: {formatBindMarkerValue(props.value.minValue)}</span>
        <span>Max: {formatBindMarkerValue(props.value.maxValue)}</span>
      </div>
    </div>
  );
}

export { KeyboardBindInput };
