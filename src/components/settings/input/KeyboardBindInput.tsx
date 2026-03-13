import { Progress, ProgressIndicator, ProgressTrack } from '@manafishrov/ui/progress';
import { createMemo, createSignal, onCleanup, onMount, type Accessor, type JSX } from 'solid-js';

import type { KeyboardInput } from '@/stores/config';

import {
  KeyboardBindActionRow,
  KeyboardBindStats,
} from '@/components/settings/input/KeyboardBindInput.parts';
import {
  BIND_CAPTURE_SETTLE_MS,
  BIND_CAPTURE_TIMEOUT_MS,
  isKeyboardKey,
  normalizeBindValue,
} from '@/input';
type KeyboardBindInputProps = {
  label: string;
  value: KeyboardInput | null;
  resetValue: KeyboardInput | null;
  onChange: (next: KeyboardInput | null) => void;
};
type KeyboardListener = (event: KeyboardEvent) => void;
type CaptureListeners = {
  keyDown: KeyboardListener;
  keyUp: KeyboardListener;
};
type KeyboardCaptureController = {
  isRecording: Accessor<boolean>;
  startCapture: () => void;
  stopRecording: () => void;
};
type CaptureSessionContext = {
  initialSnapshot: Set<string>;
  pressedKeys: Accessor<Set<string>>;
  onChange: (next: KeyboardInput | null) => void;
  stopRecording: () => void;
  setSettleTimeoutId: (timeoutId: number) => void;
};
type ScheduleSettleContext = {
  settleScheduled: boolean;
  firstChangedKey: string;
  setSettleScheduled: (next: boolean) => void;
  setSettleTimeoutId: (timeoutId: number) => void;
  commitCapture: () => void;
};
const NO_TIMEOUT_ID = 0;
const ZERO = 0;
const ONE = 1;
const EMPTY_KEY_CODE = '';
const ESCAPE_KEY_CODE = 'Escape';
const PROGRESS_MIN_VALUE = ZERO;
const PROGRESS_MAX_VALUE = ONE;
const NULL_TAG = '[object Null]';
const isNullValue = (value: unknown): value is null =>
  Object.prototype.toString.call(value) === NULL_TAG;
const parsedUnboundInput: unknown = JSON.parse('null');
if (!isNullValue(parsedUnboundInput)) {
  throw new Error('Expected parsed unbound keyboard input to be null.');
}
const getUnboundKeyboardInput = (): KeyboardInput | null => parsedUnboundInput;
const noopKeyboardListener: KeyboardListener = (event: KeyboardEvent): void => {
  if (event.defaultPrevented) {
    return;
  }
};
const createEmptyCaptureListeners = (): CaptureListeners => ({
  keyDown: noopKeyboardListener,
  keyUp: noopKeyboardListener,
});
const toKeyboardValue = (isPressed: boolean): number => (isPressed ? ONE : ZERO);
const clearTimeoutId = (timeoutId: number): number => {
  if (timeoutId > NO_TIMEOUT_ID) {
    globalThis.clearTimeout(timeoutId);
  }
  return NO_TIMEOUT_ID;
};
const removeCaptureListeners = (listeners: CaptureListeners): CaptureListeners => {
  globalThis.removeEventListener('keydown', listeners.keyDown);
  globalThis.removeEventListener('keyup', listeners.keyUp);
  return createEmptyCaptureListeners();
};
const addPressedKey = (pressed: Set<string>, keyCode: string): Set<string> => {
  if (pressed.has(keyCode)) {
    return pressed;
  }
  return new Set<string>([...pressed, keyCode]);
};
const removePressedKey = (pressed: Set<string>, keyCode: string): Set<string> => {
  if (!pressed.has(keyCode)) {
    return pressed;
  }
  return new Set<string>([...pressed].filter((pressedKey): boolean => pressedKey !== keyCode));
};
const commitCapture = (context: CaptureSessionContext, changedKey: string): void => {
  if (!isKeyboardKey(changedKey)) {
    context.stopRecording();
    return;
  }
  const latestSnapshot = new Set<string>(context.pressedKeys());
  context.onChange({
    key: changedKey,
    minValue: toKeyboardValue(context.initialSnapshot.has(changedKey)),
    maxValue: toKeyboardValue(latestSnapshot.has(changedKey)),
  });
  context.stopRecording();
};
const scheduleSettleCapture = (context: ScheduleSettleContext): void => {
  if (context.settleScheduled || context.firstChangedKey.length === ZERO) {
    return;
  }
  context.setSettleScheduled(true);
  context.setSettleTimeoutId(globalThis.setTimeout(context.commitCapture, BIND_CAPTURE_SETTLE_MS));
};
const createCaptureListeners = (context: CaptureSessionContext): CaptureListeners => {
  let firstChangedKey = EMPTY_KEY_CODE;
  let settleScheduled = false;
  const setSettleScheduled = (next: boolean): void => {
    settleScheduled = next;
  };
  const commit = (): void => {
    commitCapture(context, firstChangedKey);
  };
  const captureChangedKey = (nextChangedKey: string): void => {
    if (firstChangedKey.length > ZERO) {
      return;
    }
    firstChangedKey = nextChangedKey;
    scheduleSettleCapture({
      settleScheduled,
      firstChangedKey,
      setSettleScheduled,
      setSettleTimeoutId: context.setSettleTimeoutId,
      commitCapture: commit,
    });
  };
  const keyDown: KeyboardListener = (event: KeyboardEvent): void => {
    event.preventDefault();
    if (event.code === ESCAPE_KEY_CODE) {
      context.onChange(getUnboundKeyboardInput());
      context.stopRecording();
      return;
    }
    if (context.initialSnapshot.has(event.code)) {
      return;
    }
    captureChangedKey(event.code);
  };
  const keyUp: KeyboardListener = (event: KeyboardEvent): void => {
    event.preventDefault();
    if (!context.initialSnapshot.has(event.code)) {
      return;
    }
    captureChangedKey(event.code);
  };
  return { keyDown, keyUp };
};
const usePressedKeys = (): Accessor<Set<string>> => {
  const [pressedKeys, setPressedKeys] = createSignal<Set<string>>(new Set<string>());
  const onKeyDown = (event: KeyboardEvent): void => {
    setPressedKeys((previous): Set<string> => addPressedKey(previous, event.code));
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    setPressedKeys((previous): Set<string> => removePressedKey(previous, event.code));
  };
  const onVisibilityChange = (): void => {
    if (document.hidden) {
      setPressedKeys(new Set<string>());
    }
  };
  onMount((): void => {
    globalThis.addEventListener('keydown', onKeyDown);
    globalThis.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });
  onCleanup((): void => {
    globalThis.removeEventListener('keydown', onKeyDown);
    globalThis.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
  return pressedKeys;
};
const useKeyboardCapture = (
  pressedKeys: Accessor<Set<string>>,
  onChange: (next: KeyboardInput | null) => void,
): KeyboardCaptureController => {
  const [isRecording, setIsRecording] = createSignal<boolean>(false);
  let captureTimeoutId = NO_TIMEOUT_ID;
  let settleTimeoutId = NO_TIMEOUT_ID;
  let listeners = createEmptyCaptureListeners();
  const stopRecording = (): void => {
    captureTimeoutId = clearTimeoutId(captureTimeoutId);
    settleTimeoutId = clearTimeoutId(settleTimeoutId);
    listeners = removeCaptureListeners(listeners);
    setIsRecording(false);
  };
  const startCapture = (): void => {
    if (isRecording()) {
      return;
    }
    listeners = createCaptureListeners({
      initialSnapshot: new Set<string>(pressedKeys()),
      pressedKeys,
      onChange,
      stopRecording,
      setSettleTimeoutId: (timeoutId: number): void => {
        settleTimeoutId = timeoutId;
      },
    });
    globalThis.addEventListener('keydown', listeners.keyDown);
    globalThis.addEventListener('keyup', listeners.keyUp);
    setIsRecording(true);
    captureTimeoutId = globalThis.setTimeout(stopRecording, BIND_CAPTURE_TIMEOUT_MS);
  };
  onCleanup(stopRecording);
  return { isRecording, startCapture, stopRecording };
};
const resetToDefaultBinding = (props: KeyboardBindInputProps, stopRecording: () => void): void => {
  stopRecording();
  if (props.resetValue) {
    props.onChange({
      key: props.resetValue.key,
      minValue: props.resetValue.minValue,
      maxValue: props.resetValue.maxValue,
    });
    return;
  }
  props.onChange(getUnboundKeyboardInput());
};
const getProgressValue = (
  pressedKeys: Accessor<Set<string>>,
  value: KeyboardInput | null,
): number => {
  if (!value) {
    return ZERO;
  }
  const rawValue = toKeyboardValue(pressedKeys().has(value.key));
  return normalizeBindValue(rawValue, value.minValue, value.maxValue);
};
const getCurrentValue = (
  pressedKeys: Accessor<Set<string>>,
  value: KeyboardInput | null,
): number => {
  if (!value) {
    return ZERO;
  }
  return pressedKeys().has(value.key) ? value.maxValue : value.minValue;
};
const KeyboardBindInput = (props: KeyboardBindInputProps): JSX.Element => {
  const pressedKeys = usePressedKeys();
  const captureController = useKeyboardCapture(pressedKeys, props.onChange);
  const progressValue = createMemo((): number => getProgressValue(pressedKeys, props.value));
  const currentValue = createMemo((): number => getCurrentValue(pressedKeys, props.value));
  const onReset = (): void => {
    resetToDefaultBinding(props, captureController.stopRecording);
  };
  return (
    <div class='space-y-2'>
      <span>{props.label}</span>
      <KeyboardBindActionRow
        isRecording={captureController.isRecording()}
        value={props.value}
        onStartCapture={captureController.startCapture}
        onReset={onReset}
      />
      <Progress value={progressValue()} min={PROGRESS_MIN_VALUE} max={PROGRESS_MAX_VALUE}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <KeyboardBindStats value={props.value} currentValue={currentValue()} />
    </div>
  );
};
export { KeyboardBindInput };
