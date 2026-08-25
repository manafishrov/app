import type { CleanupFn } from '@/input/types';
import type { Config, GamepadBindings, GamepadInput, KeyboardInput } from '@/stores/config';
import type { DirectionVector } from '@/stores/directionVector';

import { getActiveGamepad, getGamepadBindings, readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';
import { isInputSuppressed } from '@/stores/inputState';

const EMPTY_INPUT: DirectionVector = [0, 0, 0, 0, 0, 0, 0, 0];
const MIN_AXIS_VALUE = -1;
const MAX_AXIS_VALUE = 1;
const MILLISECONDS_PER_SECOND = 1000;
const DIRECTION_VECTOR_SEND_FREQUENCY_HZ = 60;
export const DIRECTION_VECTOR_SEND_INTERVAL_MS =
  MILLISECONDS_PER_SECOND / DIRECTION_VECTOR_SEND_FREQUENCY_HZ;

const ignorePromiseRejection = (): boolean => false;

const clamp = (value: number): number => Math.max(MIN_AXIS_VALUE, Math.min(MAX_AXIS_VALUE, value));

type OptionalInput<InputType> = InputType | null | undefined;
export type DirectionVectorConfig = Pick<Config, 'keyboard' | 'selectedGamepadId' | 'gamepad'>;

const AxisBindingName = {
  surgeForward: 'surgeForward',
  surgeBackward: 'surgeBackward',
  swayRight: 'swayRight',
  swayLeft: 'swayLeft',
  heaveDown: 'heaveDown',
  heaveUp: 'heaveUp',
  pitchUp: 'pitchUp',
  pitchDown: 'pitchDown',
  yawRight: 'yawRight',
  yawLeft: 'yawLeft',
  rollRight: 'rollRight',
  rollLeft: 'rollLeft',
  action1Positive: 'action1Positive',
  action1Negative: 'action1Negative',
  action2Positive: 'action2Positive',
  action2Negative: 'action2Negative',
} as const;

type AxisBindingName = (typeof AxisBindingName)[keyof typeof AxisBindingName];

type AxisDefinition = {
  positive: AxisBindingName;
  negative: AxisBindingName;
};

const AXIS_DEFINITIONS = [
  { positive: AxisBindingName.surgeForward, negative: AxisBindingName.surgeBackward },
  { positive: AxisBindingName.swayRight, negative: AxisBindingName.swayLeft },
  { positive: AxisBindingName.heaveDown, negative: AxisBindingName.heaveUp },
  { positive: AxisBindingName.pitchUp, negative: AxisBindingName.pitchDown },
  { positive: AxisBindingName.yawRight, negative: AxisBindingName.yawLeft },
  { positive: AxisBindingName.rollRight, negative: AxisBindingName.rollLeft },
  { positive: AxisBindingName.action1Positive, negative: AxisBindingName.action1Negative },
  { positive: AxisBindingName.action2Positive, negative: AxisBindingName.action2Negative },
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
  config: DirectionVectorConfig,
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
  config: DirectionVectorConfig,
  pressedKeys: Set<string>,
  sendFn: (vector: DirectionVector) => Promise<void>,
): CleanupFn => {
  const sendVector = (vector: DirectionVector): void => {
    sendFn(vector).catch(ignorePromiseRejection);
  };

  const sendCurrentInput = (): void => {
    const vector = isInputSuppressed() ? EMPTY_INPUT : computeDirectionVector(config, pressedKeys);
    sendVector(vector);
  };

  sendCurrentInput();
  const interval = globalThis.setInterval(sendCurrentInput, DIRECTION_VECTOR_SEND_INTERVAL_MS);

  return (): void => {
    globalThis.clearInterval(interval);
    sendVector(EMPTY_INPUT);
  };
};
