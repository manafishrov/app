import type { CleanupFn } from '@/input/types';
import type { Config, GamepadInput, KeyboardInput } from '@/stores/config';
import type { DirectionVector } from '@/stores/directionVector';

import { getActiveGamepad, getGamepadBindings, readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';

const EMPTY_INPUT: DirectionVector = [0, 0, 0, 0, 0, 0, 0, 0];

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

type AxisInput = {
  positiveKB: KeyboardInput | null;
  negativeKB: KeyboardInput | null;
  positiveGP: GamepadInput | null;
  negativeGP: GamepadInput | null;
};

const computeAxisValue = (
  pressedKeys: Set<string>,
  gamepad: Gamepad | null,
  input: AxisInput,
): number => {
  const posKB = getKeyboardValue(input.positiveKB, pressedKeys);
  const negKB = getKeyboardValue(input.negativeKB, pressedKeys);
  const posGP = input.positiveGP && gamepad ? readGamepadInput(input.positiveGP, gamepad) : 0;
  const negGP = input.negativeGP && gamepad ? readGamepadInput(input.negativeGP, gamepad) : 0;

  return clamp(posKB + posGP - (negKB + negGP));
};

export const computeDirectionVector = (
  config: Config,
  pressedKeys: Set<string>,
): DirectionVector => {
  const kb = config.keyboard;
  const gamepad = getActiveGamepad(config.selectedGamepadId);
  const gp = getGamepadBindings(gamepad, config);

  const input: DirectionVector = [...EMPTY_INPUT];

  input[0] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.surgeForward,
    negativeKB: kb.surgeBackward,
    positiveGP: gp?.surgeForward ?? null,
    negativeGP: gp?.surgeBackward ?? null,
  });

  input[1] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.swayRight,
    negativeKB: kb.swayLeft,
    positiveGP: gp?.swayRight ?? null,
    negativeGP: gp?.swayLeft ?? null,
  });

  // Heave: NED convention - heaveDown is positive (+Z down), heaveUp is negative (-Z up)
  input[2] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.heaveDown,
    negativeKB: kb.heaveUp,
    positiveGP: gp?.heaveDown ?? null,
    negativeGP: gp?.heaveUp ?? null,
  });

  input[3] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.pitchUp,
    negativeKB: kb.pitchDown,
    positiveGP: gp?.pitchUp ?? null,
    negativeGP: gp?.pitchDown ?? null,
  });

  input[4] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.yawRight,
    negativeKB: kb.yawLeft,
    positiveGP: gp?.yawRight ?? null,
    negativeGP: gp?.yawLeft ?? null,
  });

  input[5] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.rollRight,
    negativeKB: kb.rollLeft,
    positiveGP: gp?.rollRight ?? null,
    negativeGP: gp?.rollLeft ?? null,
  });

  input[6] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.action1Positive,
    negativeKB: kb.action1Negative,
    positiveGP: gp?.action1Positive ?? null,
    negativeGP: gp?.action1Negative ?? null,
  });

  input[7] = computeAxisValue(pressedKeys, gamepad, {
    positiveKB: kb.action2Positive,
    negativeKB: kb.action2Negative,
    positiveGP: gp?.action2Positive ?? null,
    negativeGP: gp?.action2Negative ?? null,
  });

  return input;
};

export const createDirectionVectorLoop = (
  config: Config,
  pressedKeys: Set<string>,
  sendFn: (vector: DirectionVector) => Promise<void>,
): CleanupFn => {
  let frame: number | undefined;

  const loop = () => {
    const vector = computeDirectionVector(config, pressedKeys);
    void sendFn(vector);
    frame = requestAnimationFrame(loop);
  };

  loop();

  return () => {
    if (frame !== undefined) {cancelAnimationFrame(frame);}
    void sendFn(EMPTY_INPUT);
  };
};
