import type { Accessor } from 'solid-js';

import type { GamepadInput } from '@/stores/config';

import {
  BIND_CAPTURE_SETTLE_MS,
  BIND_CAPTURE_TIMEOUT_MS,
  GAMEPAD_CAPTURE_THRESHOLD,
  getActiveGamepad,
  getGamepadRawInputValue,
  normalizeBindValue,
  roundToBindIncrement,
} from '@/input';
type GamepadBindCaptureOptions = {
  value: Accessor<GamepadInput | null>;
  resetValue: Accessor<GamepadInput | null>;
  selectedGamepadId: Accessor<string | null>;
  onChange: (next: GamepadInput | null) => void;
};
type GamepadSnapshot = { buttons: number[]; axes: number[] };
type CaptureState = {
  animationFrameId: number;
  captureTimeoutId: number;
  settleTimeoutId: number;
  initialSnapshot: GamepadSnapshot;
  hasInitialSnapshot: boolean;
  changedInput: GamepadInput['input'];
  hasChangedInput: boolean;
  escapeListener: (event: KeyboardEvent) => void;
  hasEscapeListener: boolean;
};
type StartCaptureContext = {
  options: GamepadBindCaptureOptions;
  state: CaptureState;
  isRecording: boolean;
  setIsRecording: (next: boolean) => void;
};
type ProgressTickContext = {
  options: GamepadBindCaptureOptions;
  state: CaptureState;
  isRecording: boolean;
  setProgressValue: (next: number) => void;
  setCurrentValue: (next: number) => void;
  setIsRecording: (next: boolean) => void;
};
type ResetContext = {
  options: GamepadBindCaptureOptions;
  state: CaptureState;
  setIsRecording: (next: boolean) => void;
};
type ChangedInput = { found: boolean; input: GamepadInput['input'] };
type LiveValueContext = {
  value: GamepadInput | null;
  gamepad: Gamepad;
  setProgressValue: (next: number) => void;
  setCurrentValue: (next: number) => void;
};
const ZERO = 0;
const ONE = 1;
const NO_ID = ZERO;
const NO_INDEX = -ONE;
const NULL_TAG = '[object Null]';

const isNullValue = (value: unknown): value is null =>
  Object.prototype.toString.call(value) === NULL_TAG;
const parsedUnboundInput: unknown = JSON.parse('null');
if (!isNullValue(parsedUnboundInput)) {
  throw new Error('Expected parsed unbound gamepad input to be null.');
}

const getUnboundGamepadInput = (): GamepadInput | null => parsedUnboundInput;
const getUnboundGamepadInputType = (): GamepadInput['input'] | null => parsedUnboundInput;
const hasSelectedGamepadId = (selectedGamepadId: string | null): boolean =>
  typeof selectedGamepadId === 'string' && selectedGamepadId.length > ZERO;

const createEmptySnapshot = (): GamepadSnapshot => ({ buttons: [], axes: [] });
const createFallbackInput = (): GamepadInput['input'] => ({ Button: ZERO });
const createNoChangedInput = (): ChangedInput => ({ found: false, input: createFallbackInput() });
const noopEscapeListener = (event: KeyboardEvent): void => {
  if (event.defaultPrevented) {
    return;
  }
};
const snapshotGamepad = (gamepad: Gamepad): GamepadSnapshot => ({
  buttons: gamepad.buttons.map((button): number => button.value),
  axes: [...gamepad.axes],
});

const getSnapshotRawInputValue = (
  snapshot: GamepadSnapshot,
  input: GamepadInput['input'],
): number => {
  if ('Button' in input) {
    return snapshot.buttons[input.Button] ?? ZERO;
  }
  return snapshot.axes[input.Axis] ?? ZERO;
};

const getFirstChangedIndex = (initialValues: number[], latestValues: number[]): number => {
  for (let index = ZERO; index < latestValues.length; index += ONE) {
    const startValue = initialValues[index] ?? ZERO;
    const endValue = latestValues[index] ?? ZERO;
    if (Math.abs(endValue - startValue) >= GAMEPAD_CAPTURE_THRESHOLD) {
      return index;
    }
  }
  return NO_INDEX;
};

const detectChangedInput = (initial: GamepadSnapshot, latest: GamepadSnapshot): ChangedInput => {
  const changedButtonIndex = getFirstChangedIndex(initial.buttons, latest.buttons);
  if (changedButtonIndex > NO_INDEX) {
    return { found: true, input: { Button: changedButtonIndex } };
  }
  const changedAxisIndex = getFirstChangedIndex(initial.axes, latest.axes);
  if (changedAxisIndex > NO_INDEX) {
    return { found: true, input: { Axis: changedAxisIndex } };
  }
  return createNoChangedInput();
};

const clearTimer = (timerId: number): number => {
  if (timerId > NO_ID) {
    globalThis.clearTimeout(timerId);
  }
  return NO_ID;
};
const clearAnimationFrame = (frameId: number): number => {
  if (frameId > NO_ID) {
    globalThis.cancelAnimationFrame(frameId);
  }
  return NO_ID;
};
const clearCaptureTimers = (state: CaptureState): void => {
  state.captureTimeoutId = clearTimer(state.captureTimeoutId);
  state.settleTimeoutId = clearTimer(state.settleTimeoutId);
};
const removeEscapeListener = (state: CaptureState): void => {
  if (state.hasEscapeListener) {
    globalThis.removeEventListener('keydown', state.escapeListener);
    state.hasEscapeListener = false;
  }
};
const resetCaptureState = (state: CaptureState): void => {
  state.initialSnapshot = createEmptySnapshot();
  state.hasInitialSnapshot = false;
  state.changedInput = createFallbackInput();
  state.hasChangedInput = false;
};
const stopRecording = (state: CaptureState, setIsRecording: (next: boolean) => void): void => {
  clearCaptureTimers(state);
  removeEscapeListener(state);
  resetCaptureState(state);
  setIsRecording(false);
};

const createCaptureState = (): CaptureState => ({
  animationFrameId: NO_ID,
  captureTimeoutId: NO_ID,
  settleTimeoutId: NO_ID,
  initialSnapshot: createEmptySnapshot(),
  hasInitialSnapshot: false,
  changedInput: createFallbackInput(),
  hasChangedInput: false,
  escapeListener: noopEscapeListener,
  hasEscapeListener: false,
});

const setZeroProgress = (
  setProgressValue: (next: number) => void,
  setCurrentValue: (next: number) => void,
): void => {
  setProgressValue(ZERO);
  setCurrentValue(ZERO);
};
const getRawValueForBinding = (value: GamepadInput | null, gamepad: Gamepad): number => {
  const input = value ? value.input : getUnboundGamepadInputType();
  return getGamepadRawInputValue(input, gamepad);
};
const getNormalizedValue = (value: GamepadInput | null, rawValue: number): number => {
  if (value) {
    return normalizeBindValue(rawValue, value.minValue, value.maxValue);
  }
  return ZERO;
};
const updateLiveValues = (context: LiveValueContext): void => {
  const rawValue = getRawValueForBinding(context.value, context.gamepad);
  context.setCurrentValue(rawValue);
  context.setProgressValue(getNormalizedValue(context.value, rawValue));
};

const commitCapturedBinding = (options: GamepadBindCaptureOptions, state: CaptureState): void => {
  const finalGamepad = getActiveGamepad(options.selectedGamepadId());
  if (!finalGamepad || !state.hasInitialSnapshot || !state.hasChangedInput) {
    return;
  }
  const minValue = roundToBindIncrement(
    getSnapshotRawInputValue(state.initialSnapshot, state.changedInput),
  );
  const maxValue = roundToBindIncrement(getGamepadRawInputValue(state.changedInput, finalGamepad));
  options.onChange({ input: state.changedInput, minValue, maxValue });
};
const scheduleSettledCommit = (
  options: GamepadBindCaptureOptions,
  state: CaptureState,
  setIsRecording: (next: boolean) => void,
): void => {
  state.settleTimeoutId = globalThis.setTimeout((): void => {
    commitCapturedBinding(options, state);
    stopRecording(state, setIsRecording);
  }, BIND_CAPTURE_SETTLE_MS);
};

const maybeScheduleDetectedCapture = (context: ProgressTickContext, gamepad: Gamepad): void => {
  if (!context.isRecording || !context.state.hasInitialSnapshot || context.state.hasChangedInput) {
    return;
  }
  const detectedInput = detectChangedInput(context.state.initialSnapshot, snapshotGamepad(gamepad));
  if (!detectedInput.found) {
    return;
  }
  context.state.changedInput = detectedInput.input;
  context.state.hasChangedInput = true;
  scheduleSettledCommit(context.options, context.state, context.setIsRecording);
};
const updateProgressTick = (context: ProgressTickContext): void => {
  const gamepad = getActiveGamepad(context.options.selectedGamepadId());
  if (!gamepad) {
    setZeroProgress(context.setProgressValue, context.setCurrentValue);
    return;
  }
  updateLiveValues({
    value: context.options.value(),
    gamepad,
    setProgressValue: context.setProgressValue,
    setCurrentValue: context.setCurrentValue,
  });
  maybeScheduleDetectedCapture(context, gamepad);
};

const attachEscapeListener = (
  options: GamepadBindCaptureOptions,
  state: CaptureState,
  setIsRecording: (next: boolean) => void,
): void => {
  state.escapeListener = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      options.onChange(getUnboundGamepadInput());
      stopRecording(state, setIsRecording);
    }
  };
  state.hasEscapeListener = true;
  globalThis.addEventListener('keydown', state.escapeListener);
};
const scheduleCaptureTimeout = (context: StartCaptureContext): void => {
  context.state.captureTimeoutId = globalThis.setTimeout((): void => {
    stopRecording(context.state, context.setIsRecording);
  }, BIND_CAPTURE_TIMEOUT_MS);
};
const setCaptureSnapshot = (context: StartCaptureContext, gamepad: Gamepad): void => {
  context.state.initialSnapshot = snapshotGamepad(gamepad);
  context.state.hasInitialSnapshot = true;
  context.state.hasChangedInput = false;
};
const startCaptureSession = (context: StartCaptureContext): void => {
  if (context.isRecording) {
    return;
  }
  const gamepad = getActiveGamepad(context.options.selectedGamepadId());
  if (!gamepad) {
    return;
  }
  attachEscapeListener(context.options, context.state, context.setIsRecording);
  setCaptureSnapshot(context, gamepad);
  context.setIsRecording(true);
  scheduleCaptureTimeout(context);
};
const resetToDefaultBinding = (context: ResetContext): void => {
  stopRecording(context.state, context.setIsRecording);
  const resetValue = context.options.resetValue();
  if (resetValue) {
    context.options.onChange({
      input: resetValue.input,
      minValue: roundToBindIncrement(resetValue.minValue),
      maxValue: roundToBindIncrement(resetValue.maxValue),
    });
    return;
  }
  context.options.onChange(getUnboundGamepadInput());
};
export {
  clearAnimationFrame,
  createCaptureState,
  hasSelectedGamepadId,
  resetToDefaultBinding,
  startCaptureSession,
  stopRecording,
  updateProgressTick,
};
export type { CaptureState, GamepadBindCaptureOptions, ProgressTickContext };
