import type { CleanupFn } from '@/input/types';
import type { Config, GamepadInput, KeyboardInput } from '@/stores/config';

import { getActiveGamepad, getGamepadBindings, readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';
import { setRecordingStore } from '@/stores/recording';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

type ToggleState = {
  autoStabilization: boolean;
  depthHold: boolean;
  record: boolean;
};

const isInputPressed = (
  input: { keyboard: KeyboardInput; gamepad: GamepadInput | null },
  pressedKeys: Set<string>,
  gamepad: Gamepad | null,
): boolean => {
  const kbValue = getKeyboardValue(input.keyboard, pressedKeys);
  const gpValue = input.gamepad && gamepad ? readGamepadInput(input.gamepad, gamepad) : 0;
  return kbValue > 0.5 || gpValue > 0.5;
};

export const createStateToggleLoop = (
  config: Config,
  pressedKeys: Set<string>,
  isRecording: boolean,
  webrtcConnected: boolean,
): CleanupFn => {
  let frame: number | undefined;
  const lastState: ToggleState = {
    autoStabilization: false,
    depthHold: false,
    record: false,
  };

  const handleToggle = (
    isPressed: boolean,
    state: keyof ToggleState,
    action: () => Promise<void>,
  ) => {
    if (isPressed && !lastState[state]) {
      void action();
      lastState[state] = true;
    } else if (!isPressed) {
      lastState[state] = false;
    }
  };

  const loop = () => {
    const kb = config.keyboard;
    const gamepad = getActiveGamepad();
    const gp = getGamepadBindings(gamepad, config);

    const autoStabPressed = isInputPressed(
      { keyboard: kb.autoStabilization, gamepad: gp?.autoStabilization ?? null },
      pressedKeys,
      gamepad,
    );
    handleToggle(autoStabPressed, 'autoStabilization', toggleAutoStabilization);

    const depthHoldPressed = isInputPressed(
      { keyboard: kb.depthHold, gamepad: gp?.depthHold ?? null },
      pressedKeys,
      gamepad,
    );
    handleToggle(depthHoldPressed, 'depthHold', toggleDepthHold);

    const recordPressed = isInputPressed(
      { keyboard: kb.record, gamepad: gp?.record ?? null },
      pressedKeys,
      gamepad,
    );

    if (recordPressed && !lastState.record && webrtcConnected) {
      setRecordingStore({
        isRecording: !isRecording,
        startTime: isRecording ? null : Date.now(),
      });
      lastState.record = true;
    } else if (!recordPressed) {
      lastState.record = false;
    }

    frame = requestAnimationFrame(loop);
  };

  loop();

  return () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
};
