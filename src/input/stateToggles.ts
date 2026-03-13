import type { CleanupFn } from '@/input/types';
import type { Config, GamepadBindings, GamepadInput, KeyboardInput } from '@/stores/config';

import { getActiveGamepad, getGamepadBindings, readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';
import { setRecordingStore } from '@/stores/recording';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

type ToggleState = {
  autoStabilization: boolean;
  depthHold: boolean;
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

type ToggleActionArgs = {
  isPressed: boolean;
  state: keyof ToggleState;
  lastState: ToggleState;
  action: () => Promise<void>;
};

const THRESHOLD = 0.5;
const [undefinedNumber] = [] as (number | undefined)[];

const createNullValue = <ValueType>(): ValueType | null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null match result');
  }

  return result;
};

const getNullValue = <ValueType>(): ValueType | null => createNullValue<ValueType>();

const isInputPressed = (
  input: { keyboard: KeyboardInput | null; gamepad: GamepadInput | null },
  pressedKeys: Set<string>,
  gamepad: Gamepad | null,
): boolean => {
  const kbValue = getKeyboardValue(input.keyboard, pressedKeys);
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
    return getNullValue<GamepadBindings>();
  }

  const bindings = getGamepadBindings(gamepad, config);
  return bindings ?? getNullValue<GamepadBindings>();
};

const getGamepadInput = (
  bindings: GamepadBindings | null,
  key: keyof Pick<GamepadBindings, 'autoStabilization' | 'depthHold' | 'record'>,
): GamepadInput | null => {
  if (!bindings) {
    return getNullValue<GamepadInput>();
  }

  return bindings[key];
};

const handleAutoStabilizationToggle = (ctx: ToggleContext): void => {
  const kb = ctx.config.keyboard;
  const gp = getGamepadBindingsOrNull(ctx.gamepad, ctx.config);

  const autoStabPressed = isInputPressed(
    { keyboard: kb.autoStabilization, gamepad: getGamepadInput(gp, 'autoStabilization') },
    ctx.pressedKeys,
    ctx.gamepad,
  );
  handleToggle({
    isPressed: autoStabPressed,
    state: 'autoStabilization',
    lastState: ctx.lastState,
    action: toggleAutoStabilization,
  });
};

const handleDepthHoldToggle = (ctx: ToggleContext): void => {
  const kb = ctx.config.keyboard;
  const gp = getGamepadBindingsOrNull(ctx.gamepad, ctx.config);

  const depthHoldPressed = isInputPressed(
    { keyboard: kb.depthHold, gamepad: getGamepadInput(gp, 'depthHold') },
    ctx.pressedKeys,
    ctx.gamepad,
  );
  handleToggle({
    isPressed: depthHoldPressed,
    state: 'depthHold',
    lastState: ctx.lastState,
    action: toggleDepthHold,
  });
};

const handleRecordingToggle = (ctx: ToggleContext): void => {
  const kb = ctx.config.keyboard;
  const gp = getGamepadBindingsOrNull(ctx.gamepad, ctx.config);

  const recordPressed = isInputPressed(
    { keyboard: kb.record, gamepad: getGamepadInput(gp, 'record') },
    ctx.pressedKeys,
    ctx.gamepad,
  );

  const isRecording = ctx.getIsRecording();
  const webrtcConnected = ctx.getWebrtcConnected();

  if (recordPressed && !ctx.lastState.record && webrtcConnected) {
    const startTime = isRecording ? undefinedNumber : Date.now();
    setRecordingStore({
      isRecording: !isRecording,
      startTime,
    });
    ctx.lastState.record = true;
  } else if (!recordPressed) {
    ctx.lastState.record = false;
  }
};

export const createStateToggleLoop = (
  ...[config, pressedKeys, getIsRecording, getWebrtcConnected]: [
    Config,
    Set<string>,
    () => boolean,
    () => boolean,
  ]
): CleanupFn => {
  let frame: number | null = getNullValue<number>();
  const lastState: ToggleState = {
    autoStabilization: false,
    depthHold: false,
    record: false,
  };

  const loop = (): void => {
    const gamepad = getActiveGamepad(config.selectedGamepadId);

    const ctx: ToggleContext = {
      config,
      pressedKeys,
      gamepad,
      lastState,
      getIsRecording,
      getWebrtcConnected,
    };

    handleAutoStabilizationToggle(ctx);
    handleDepthHoldToggle(ctx);
    handleRecordingToggle(ctx);

    frame = requestAnimationFrame(loop);
  };

  loop();

  return (): void => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
  };
};
