import type { Config, GamepadBindings, GamepadInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

const createNullValue = <ValueType>(): ValueType | null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null match result');
  }

  return result;
};

const getNullValue = <ValueType>(): ValueType | null => createNullValue<ValueType>();

const getButtonInputRawValue = (input: GamepadInput, gamepad: Gamepad): number | null => {
  if (!('Button' in input.input)) {
    return getNullValue<number>();
  }

  const button = input.input as { Button: number };
  const buttonData = gamepad.buttons[button.Button];

  if (!buttonData) {
    return getNullValue<number>();
  }

  return buttonData.value ?? 0;
};

const getAxisInputRawValue = (input: GamepadInput, gamepad: Gamepad): number | null => {
  if (!('Axis' in input.input)) {
    return getNullValue<number>();
  }

  const axis = input.input as { Axis: number };
  return gamepad.axes[axis.Axis] ?? 0;
};

export const readGamepadInput = (input: GamepadInput | null, gamepad: Gamepad | null): number => {
  if (!input || !gamepad) {
    return 0;
  }

  const buttonRaw = getButtonInputRawValue(input, gamepad);
  if (typeof buttonRaw === 'number') {
    return normalizeBindValue(buttonRaw, input.minValue, input.maxValue);
  }

  const axisRaw = getAxisInputRawValue(input, gamepad);
  if (typeof axisRaw === 'number') {
    return normalizeBindValue(axisRaw, input.minValue, input.maxValue);
  }

  return 0;
};

export const getGamepadBindings = (
  gamepad: Gamepad | null,
  config: Config,
): GamepadBindings | null => {
  if (!gamepad) {
    return getNullValue<GamepadBindings>();
  }

  if (typeof config.selectedGamepadId === 'string') {
    const selectedBindings = config.gamepad[config.selectedGamepadId];
    if (selectedBindings) {
      return selectedBindings;
    }
  }

  return config.gamepad[gamepad.id] ?? getNullValue<GamepadBindings>();
};

export const getConnectedGamepads = (): Gamepad[] => {
  if (typeof navigator.getGamepads !== 'function') {
    return [];
  }

  const gamepads = navigator.getGamepads();
  return [...gamepads].filter((gamepad): gamepad is Gamepad => {
    if (!gamepad) {
      return false;
    }
    return gamepad.connected;
  });
};

export const getActiveGamepad = (selectedGamepadId: string | null): Gamepad | null => {
  const connectedGamepads = getConnectedGamepads();
  if (connectedGamepads.length === 0 || typeof selectedGamepadId !== 'string') {
    return getNullValue<Gamepad>();
  }

  return (
    connectedGamepads.find((gamepad) => gamepad.id === selectedGamepadId) ?? getNullValue<Gamepad>()
  );
};
