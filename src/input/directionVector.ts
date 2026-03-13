import type { CleanupFn } from '@/input/types';
import type { Config, GamepadBindings, GamepadInput, KeyboardInput } from '@/stores/config';
import type { DirectionVector } from '@/stores/directionVector';

import { getActiveGamepad, getGamepadBindings, readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';

const EMPTY_INPUT: DirectionVector = [0, 0, 0, 0, 0, 0, 0, 0];
const MIN_AXIS_VALUE = -1;
const MAX_AXIS_VALUE = 1;

const ignorePromiseRejection = (): boolean => false;

const clamp = (value: number): number => Math.max(MIN_AXIS_VALUE, Math.min(MAX_AXIS_VALUE, value));

type OptionalInput<InputType> = InputType | null | undefined;

type AxisBindingName =
  | 'surgeForward'
  | 'surgeBackward'
  | 'swayRight'
  | 'swayLeft'
  | 'heaveDown'
  | 'heaveUp'
  | 'pitchUp'
  | 'pitchDown'
  | 'yawRight'
  | 'yawLeft'
  | 'rollRight'
  | 'rollLeft'
  | 'action1Positive'
  | 'action1Negative'
  | 'action2Positive'
  | 'action2Negative';

type AxisDefinition = {
  positive: AxisBindingName;
  negative: AxisBindingName;
};

const AXIS_DEFINITIONS = [
  { positive: 'surgeForward', negative: 'surgeBackward' },
  { positive: 'swayRight', negative: 'swayLeft' },
  { positive: 'heaveDown', negative: 'heaveUp' },
  { positive: 'pitchUp', negative: 'pitchDown' },
  { positive: 'yawRight', negative: 'yawLeft' },
  { positive: 'rollRight', negative: 'rollLeft' },
  { positive: 'action1Positive', negative: 'action1Negative' },
  { positive: 'action2Positive', negative: 'action2Negative' },
] as const satisfies readonly [
  AxisDefinition,
  AxisDefinition,
  AxisDefinition,
  AxisDefinition,
  AxisDefinition,
  AxisDefinition,
  AxisDefinition,
  AxisDefinition,
];

type AxisInput = {
  positiveKB: OptionalInput<KeyboardInput>;
  negativeKB: OptionalInput<KeyboardInput>;
  positiveGP: OptionalInput<GamepadInput>;
  negativeGP: OptionalInput<GamepadInput>;
};

const getGamepadBinding = (
  bindings: GamepadBindings | null,
  key: AxisBindingName,
): OptionalInput<GamepadInput> => {
  if (!bindings) {
    return;
  }

  return bindings[key];
};

const createAxisInput = (
  definition: AxisDefinition,
  keyboard: Config['keyboard'],
  gamepadBindings: GamepadBindings | null,
): AxisInput => ({
  positiveKB: keyboard[definition.positive],
  negativeKB: keyboard[definition.negative],
  positiveGP: getGamepadBinding(gamepadBindings, definition.positive),
  negativeGP: getGamepadBinding(gamepadBindings, definition.negative),
});

const computeAxisValue = (
  pressedKeys: Set<string>,
  gamepad: Gamepad | null,
  input: AxisInput,
): number => {
  const posKB = input.positiveKB ? getKeyboardValue(input.positiveKB, pressedKeys) : 0;
  const negKB = input.negativeKB ? getKeyboardValue(input.negativeKB, pressedKeys) : 0;
  const posGP = input.positiveGP && gamepad ? readGamepadInput(input.positiveGP, gamepad) : 0;
  const negGP = input.negativeGP && gamepad ? readGamepadInput(input.negativeGP, gamepad) : 0;

  return clamp(posKB + posGP - (negKB + negGP));
};

export const computeDirectionVector = (
  config: Config,
  pressedKeys: Set<string>,
): DirectionVector => {
  const { keyboard, selectedGamepadId } = config;
  const gamepad = getActiveGamepad(selectedGamepadId);
  const gamepadBindings = getGamepadBindings(gamepad, config);
  const [surge, sway, heave, pitch, yaw, roll, action1, action2] = AXIS_DEFINITIONS;
  const computeAxis = (definition: AxisDefinition): number => {
    const axisInput = createAxisInput(definition, keyboard, gamepadBindings);
    return computeAxisValue(pressedKeys, gamepad, axisInput);
  };

  return [
    computeAxis(surge),
    computeAxis(sway),
    computeAxis(heave),
    computeAxis(pitch),
    computeAxis(yaw),
    computeAxis(roll),
    computeAxis(action1),
    computeAxis(action2),
  ];
};

export const createDirectionVectorLoop = (
  config: Config,
  pressedKeys: Set<string>,
  sendFn: (vector: DirectionVector) => Promise<void>,
): CleanupFn => {
  let frame = 0;

  const sendVector = (vector: DirectionVector): void => {
    sendFn(vector).catch(ignorePromiseRejection);
  };

  const loop = (): void => {
    const vector = computeDirectionVector(config, pressedKeys);
    sendVector(vector);
    frame = requestAnimationFrame(loop);
  };

  loop();

  return (): void => {
    if (frame > 0) {
      cancelAnimationFrame(frame);
    }
    sendVector(EMPTY_INPUT);
  };
};
