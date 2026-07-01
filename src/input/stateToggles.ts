import type { CleanupFn } from '@/input/types';
import type { Config, GamepadBindings, GamepadInput, KeyboardInput } from '@/stores/config';

import {
  handleCustomActionToggles,
  type CustomActionToggleState,
} from '@/input/customActionToggles';
import { getActiveGamepad, getGamepadBindings, readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';
import { handleRecordingToggle } from '@/input/recordingToggle';
import {
  adjustDesiredDepthDraft,
  closeDesiredDepthPopup,
  desiredDepthPopupStore,
  openDesiredDepthPopup,
} from '@/stores/desiredDepthPopup';
import { isInputSuppressed } from '@/stores/inputState';
import { rovTelemetryStore } from '@/stores/rovTelemetry';
import { vibrateConfirm } from '@/tauri/gamepad';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

type ToggleState = {
  autoStabilization: boolean;
  depthHold: boolean;
  desiredDepthEntry: boolean;
  record: boolean;
};

type ToggleContext = {
  config: Config;
  pressedKeys: Set<string>;
  gamepad: Gamepad | null;
  lastState: ToggleState;
  getIsRecording: () => boolean;
  getWebrtcConnected: () => boolean;
};
type ToggleLoopArgs = Omit<ToggleContext, 'gamepad'>;
type ToggleActionArgs = {
  isPressed: boolean;
  state: keyof ToggleState;
  lastState: ToggleState;
  action: () => Promise<void>;
};
type InputPair = { keyboard: KeyboardInput | null; gamepad: GamepadInput | null };
type PressedInputArgs = {
  input: InputPair;
  pressedKeys: Set<string>;
  gamepad: Gamepad | null;
  ignoreKeyboard?: boolean;
};
type DesiredDepthAdjustConfig = {
  state: 'desiredDepthIncrease' | 'desiredDepthDecrease';
  bindingKey: 'desiredDepthIncrease' | 'desiredDepthDecrease';
  delta: number;
};
type DesiredDepthRepeatState = Record<'desiredDepthIncrease' | 'desiredDepthDecrease', number>;
type PopupGamepadBindingKey = 'desiredDepthEntry' | 'desiredDepthIncrease' | 'desiredDepthDecrease';
type ToggleBindingKey = 'autoStabilization' | 'depthHold' | 'record' | PopupGamepadBindingKey;
const THRESHOLD = 0.5;
const DESIRED_DEPTH_STEP = 0.1;
const DESIRED_DEPTH_REPEAT_DELAY_MS = 200;
const DESIRED_DEPTH_REPEAT_INTERVAL_MS = 40;

const isInputPressed = ({
  input,
  pressedKeys,
  gamepad,
  ignoreKeyboard = false,
}: PressedInputArgs): boolean => {
  const kbValue = ignoreKeyboard ? 0 : getKeyboardValue(input.keyboard, pressedKeys);
  const gpValue = input.gamepad && gamepad ? readGamepadInput(input.gamepad, gamepad) : 0;
  return kbValue > THRESHOLD || gpValue > THRESHOLD;
};
const executeActionSilently = (action: () => Promise<void>): void => {
  action().catch(() => {
    // Intentionally silent - prevents unhandled promise rejection
  });
};
const handleToggle = ({ isPressed, state, lastState, action }: ToggleActionArgs): void => {
  if (isPressed && !lastState[state]) {
    executeActionSilently(action);
    lastState[state] = true;
  } else if (!isPressed) {
    lastState[state] = false;
  }
};
const getGamepadBindingsOrNull = (
  gamepad: Gamepad | null,
  config: Config,
): GamepadBindings | null => {
  if (!gamepad) {
    return null;
  }
  const bindings = getGamepadBindings(gamepad, config);
  return bindings ?? null;
};
const getGamepadInput = (
  bindings: GamepadBindings | null,
  key: ToggleBindingKey,
): GamepadInput | null => {
  if (!bindings) {
    return null;
  }
  return bindings[key];
};
const getToggleInput = (ctx: ToggleContext, key: ToggleBindingKey): InputPair => {
  const bindings = getGamepadBindingsOrNull(ctx.gamepad, ctx.config);
  return {
    keyboard: ctx.config.keyboard[key],
    gamepad: getGamepadInput(bindings, key),
  };
};
const handleDesiredDepthEntryToggle = (ctx: ToggleContext): void => {
  const isPressed = isInputPressed({
    input: getToggleInput(ctx, 'desiredDepthEntry'),
    pressedKeys: ctx.pressedKeys,
    gamepad: ctx.gamepad,
  });
  handleToggle({
    isPressed,
    state: 'desiredDepthEntry',
    lastState: ctx.lastState,
    action: () => {
      if (desiredDepthPopupStore.isOpen) {
        return closeDesiredDepthPopup();
      }
      vibrateConfirm(ctx.config.selectedGamepadId);
      openDesiredDepthPopup(rovTelemetryStore.desiredDepth);
      return Promise.resolve();
    },
  });
};
const handleDesiredDepthAdjust = (
  ctx: ToggleContext,
  config: DesiredDepthAdjustConfig,
  repeatState: DesiredDepthRepeatState,
): void => {
  const isPressed = isInputPressed({
    input: getToggleInput(ctx, config.bindingKey),
    pressedKeys: ctx.pressedKeys,
    gamepad: ctx.gamepad,
  });
  const now = performance.now();
  if (!isPressed) {
    repeatState[config.state] = 0;
    return;
  }

  if (!desiredDepthPopupStore.isOpen) {
    return;
  }
  if (repeatState[config.state] === 0 || now >= repeatState[config.state]) {
    adjustDesiredDepthDraft(config.delta);
    repeatState[config.state] =
      repeatState[config.state] === 0
        ? now + DESIRED_DEPTH_REPEAT_DELAY_MS
        : now + DESIRED_DEPTH_REPEAT_INTERVAL_MS;
  }
};
const handleAutoStabilizationToggle = (ctx: ToggleContext): void => {
  const isPressed = isInputPressed({
    input: getToggleInput(ctx, 'autoStabilization'),
    pressedKeys: ctx.pressedKeys,
    gamepad: ctx.gamepad,
  });
  if (isPressed && !ctx.lastState.autoStabilization) {
    vibrateConfirm(ctx.config.selectedGamepadId);
  }
  handleToggle({
    isPressed,
    state: 'autoStabilization',
    lastState: ctx.lastState,
    action: toggleAutoStabilization,
  });
};
const handleDepthHoldToggle = (ctx: ToggleContext): void => {
  const isPressed = isInputPressed({
    input: getToggleInput(ctx, 'depthHold'),
    pressedKeys: ctx.pressedKeys,
    gamepad: ctx.gamepad,
  });
  if (isPressed && !ctx.lastState.depthHold) {
    vibrateConfirm(ctx.config.selectedGamepadId);
  }
  handleToggle({
    isPressed,
    state: 'depthHold',
    lastState: ctx.lastState,
    action: toggleDepthHold,
  });
};
const handleRecordingInput = (ctx: ToggleContext): void => {
  const recordPressed = isInputPressed({
    input: getToggleInput(ctx, 'record'),
    pressedKeys: ctx.pressedKeys,
    gamepad: ctx.gamepad,
  });
  if (recordPressed && !ctx.lastState.record && ctx.getWebrtcConnected()) {
    vibrateConfirm(ctx.config.selectedGamepadId);
  }
  handleRecordingToggle({
    isPressed: recordPressed,
    lastState: ctx.lastState,
    getIsRecording: ctx.getIsRecording,
    getWebrtcConnected: ctx.getWebrtcConnected,
  });
};
const createToggleContext = ({
  config,
  pressedKeys,
  lastState,
  getIsRecording,
  getWebrtcConnected,
}: ToggleLoopArgs): ToggleContext => ({
  config,
  pressedKeys,
  gamepad: getActiveGamepad(config.selectedGamepadId),
  lastState,
  getIsRecording,
  getWebrtcConnected,
});
const handleSuppressedFrame = (ctx: ToggleContext, repeatState: DesiredDepthRepeatState): void => {
  handleDesiredDepthAdjust(
    ctx,
    {
      state: 'desiredDepthIncrease',
      bindingKey: 'desiredDepthIncrease',
      delta: DESIRED_DEPTH_STEP,
    },
    repeatState,
  );
  handleDesiredDepthAdjust(
    ctx,
    {
      state: 'desiredDepthDecrease',
      bindingKey: 'desiredDepthDecrease',
      delta: -DESIRED_DEPTH_STEP,
    },
    repeatState,
  );
};
const handleDefaultFrame = (
  ctx: ToggleContext,
  customActionState: CustomActionToggleState,
): void => {
  handleAutoStabilizationToggle(ctx);
  handleDepthHoldToggle(ctx);
  handleCustomActionToggles({
    config: ctx.config,
    pressedKeys: ctx.pressedKeys,
    gamepad: ctx.gamepad,
    state: customActionState,
  });
  handleRecordingInput(ctx);
};

export const createStateToggleLoop = (
  ...[config, pressedKeys, getIsRecording, getWebrtcConnected]: [
    Config,
    Set<string>,
    () => boolean,
    () => boolean,
  ]
): CleanupFn => {
  let frame: number | null = null;
  const lastState: ToggleState = {
    autoStabilization: false,
    depthHold: false,
    desiredDepthEntry: false,
    record: false,
  };
  const desiredDepthRepeatState: DesiredDepthRepeatState = {
    desiredDepthIncrease: 0,
    desiredDepthDecrease: 0,
  };
  const customActionState: CustomActionToggleState = new Map();
  const loop = (): void => {
    const ctx = createToggleContext({
      config,
      pressedKeys,
      lastState,
      getIsRecording,
      getWebrtcConnected,
    });
    handleDesiredDepthEntryToggle(ctx);
    if (isInputSuppressed()) {
      handleSuppressedFrame(ctx, desiredDepthRepeatState);
      frame = requestAnimationFrame(loop);
      return;
    }
    handleDefaultFrame(ctx, customActionState);
    frame = requestAnimationFrame(loop);
  };
  loop();
  return (): void => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
  };
};
