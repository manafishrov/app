import type { TouchAxes } from '@/input/touch';
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
export type DirectionVectorSources = {
  pressedKeys: Set<string>;
  touchAxes?: Readonly<TouchAxes>;
};
export type DirectionVectorTransport = {
  deactivate: () => Promise<void>;
  send: (vector: DirectionVector) => Promise<void>;
};

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

// Unclamped, so touch input can still be added before limiting the axis.
const sumAxisInputs = (
  pressedKeys: Set<string>,
  gamepad: Gamepad | null,
  input: AxisInput,
): number => {
  const posKB = input.positiveKB ? getKeyboardValue(input.positiveKB, pressedKeys) : 0;
  const negKB = input.negativeKB ? getKeyboardValue(input.negativeKB, pressedKeys) : 0;
  const posGP = input.positiveGP && gamepad ? readGamepadInput(input.positiveGP, gamepad) : 0;
  const negGP = input.negativeGP && gamepad ? readGamepadInput(input.negativeGP, gamepad) : 0;

  return posKB + posGP - (negKB + negGP);
};

export const computeDirectionVector = (
  config: DirectionVectorConfig,
  pressedKeys: Set<string>,
  touchAxes: Readonly<TouchAxes> = EMPTY_INPUT,
): DirectionVector => {
  const { keyboard, selectedGamepadId } = config;
  const gamepad = getActiveGamepad(selectedGamepadId);
  const gamepadBindings = getGamepadBindings(gamepad, config);
  const [surge, sway, heave, pitch, yaw, roll, action1, action2] = AXIS_DEFINITIONS;
  const [touchSurge, touchSway, touchHeave, touchPitch, touchYaw, touchRoll, touch1, touch2] =
    touchAxes;
  const computeAxis = (definition: AxisDefinition, touch: number): number => {
    const axisInput = createAxisInput(definition, keyboard, gamepadBindings);
    return clamp(sumAxisInputs(pressedKeys, gamepad, axisInput) + touch);
  };

  return [
    computeAxis(surge, touchSurge),
    computeAxis(sway, touchSway),
    computeAxis(heave, touchHeave),
    computeAxis(pitch, touchPitch),
    computeAxis(yaw, touchYaw),
    computeAxis(roll, touchRoll),
    computeAxis(action1, touch1),
    computeAxis(action2, touch2),
  ];
};

export const createDirectionVectorLoop = (
  config: DirectionVectorConfig,
  { pressedKeys, touchAxes = EMPTY_INPUT }: DirectionVectorSources,
  transport: DirectionVectorTransport,
): CleanupFn => {
  let inFlight = false;
  let queuedVector: DirectionVector | null = null;
  let stopped = false;

  const sendVector = (vector: DirectionVector): void => {
    if (inFlight) {
      queuedVector = vector;
      return;
    }
    inFlight = true;
    transport
      .send(vector)
      .catch(ignorePromiseRejection)
      .finally(() => {
        inFlight = false;
        if (stopped || queuedVector === null) {
          return;
        }
        const nextVector = queuedVector;
        queuedVector = null;
        sendVector(nextVector);
      })
      .catch(ignorePromiseRejection);
  };

  const sendCurrentInput = (): void => {
    const vector = isInputSuppressed()
      ? EMPTY_INPUT
      : computeDirectionVector(config, pressedKeys, touchAxes);
    sendVector(vector);
  };

  sendCurrentInput();
  const interval = globalThis.setInterval(sendCurrentInput, DIRECTION_VECTOR_SEND_INTERVAL_MS);

  return (): void => {
    stopped = true;
    queuedVector = null;
    globalThis.clearInterval(interval);
    transport.deactivate().catch(ignorePromiseRejection);
  };
};
