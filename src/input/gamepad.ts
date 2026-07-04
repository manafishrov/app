import type { Config, GamepadBindings, GamepadInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

const getButtonInputRawValue = (input: GamepadInput, gamepad: Gamepad): number | null => {
  if (!('Button' in input.input)) {
    return null;
  }

  const buttonData = gamepad.buttons[input.input.Button];

  if (!buttonData) {
    return null;
  }

  return buttonData.value ?? 0;
};

const getAxisInputRawValue = (input: GamepadInput, gamepad: Gamepad): number | null => {
  if (!('Axis' in input.input)) {
    return null;
  }

  return gamepad.axes[input.input.Axis] ?? 0;
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
    return null;
  }

  if (typeof config.selectedGamepadId === 'string') {
    const selectedBindings = config.gamepad[config.selectedGamepadId];
    if (selectedBindings) {
      return selectedBindings;
    }
  }

  return config.gamepad[gamepad.id] ?? null;
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
    return null;
  }

  return connectedGamepads.find((gamepad) => gamepad.id === selectedGamepadId) ?? null;
};
