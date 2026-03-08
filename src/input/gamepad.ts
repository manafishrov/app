import type { Config, GamepadBindings, GamepadInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

export const readGamepadInput = (input: GamepadInput | null, gamepad: Gamepad | null): number => {
  if (!input || !gamepad) {
    return 0;
  }

  if ('Button' in input.input) {
    const idx = input.input.Button;
    const raw = gamepad.buttons[idx]?.value ?? 0;
    return normalizeBindValue(raw, input.minValue, input.maxValue);
  }

  if ('Axis' in input.input) {
    const idx = input.input.Axis;
    const raw = gamepad.axes[idx] ?? 0;
    return normalizeBindValue(raw, input.minValue, input.maxValue);
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

  if (config.selectedGamepadId) {
    const selectedBindings = config.gamepad[config.selectedGamepadId];
    if (selectedBindings) {
      return selectedBindings;
    }
  }

  return config.gamepad[gamepad.id] ?? null;
};

export const getConnectedGamepads = (): Gamepad[] => {
  const gamepads = navigator.getGamepads?.() ?? [];
  return [...gamepads].filter((gamepad): gamepad is Gamepad =>
    Boolean(gamepad && gamepad.connected),
  );
};

export const getActiveGamepad = (selectedGamepadId: string | null): Gamepad | null => {
  const connectedGamepads = getConnectedGamepads();
  if (connectedGamepads.length === 0 || !selectedGamepadId) {
    return null;
  }

  return connectedGamepads.find((gamepad) => gamepad.id === selectedGamepadId) ?? null;
};
