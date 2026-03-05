import type { Config, GamepadBindings, GamepadInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

export const mapGamepadValue = (rawValue: number, minValue: number, maxValue: number): number => {
  return normalizeBindValue(rawValue, minValue, maxValue);
};

export const readGamepadInput = (input: GamepadInput, gamepad: Gamepad | null): number => {
  if (!gamepad) return 0;

  if ('Button' in input.input) {
    const idx = input.input.Button;
    const raw = gamepad.buttons[idx]?.value ?? 0;
    return mapGamepadValue(raw, input.minValue, input.maxValue);
  }

  if ('Axis' in input.input) {
    const idx = input.input.Axis;
    const raw = gamepad.axes[idx] ?? 0;
    return mapGamepadValue(raw, input.minValue, input.maxValue);
  }

  return 0;
};

export const getGamepadBindings = (
  gamepad: Gamepad | null,
  config: Config,
): GamepadBindings | null => {
  if (!gamepad) return null;

  if (config.selectedGamepadId && gamepad.id === config.selectedGamepadId) {
    return config.gamepad[config.selectedGamepadId] ?? null;
  }

  return config.gamepad[gamepad.id] ?? null;
};

export const getConnectedGamepads = (): Gamepad[] => {
  const gamepads = navigator.getGamepads?.() ?? [];
  return Array.from(gamepads).filter((gamepad): gamepad is Gamepad => {
    return Boolean(gamepad && gamepad.connected);
  });
};

export const getActiveGamepad = (selectedGamepadId: string | null): Gamepad | null => {
  const connectedGamepads = getConnectedGamepads();
  if (connectedGamepads.length === 0) return null;

  if (!selectedGamepadId) {
    return connectedGamepads[0] ?? null;
  }

  return (
    connectedGamepads.find((gamepad) => gamepad.id === selectedGamepadId) ??
    connectedGamepads[0] ??
    null
  );
};
