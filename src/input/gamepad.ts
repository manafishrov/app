import type { Config, GamepadBindings, GamepadInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

const GAMEPAD_KEY_SEPARATOR = '@@';

export const toGamepadBindingKey = (gamepad: Pick<Gamepad, 'id' | 'index'>): string => {
  return `${gamepad.id}${GAMEPAD_KEY_SEPARATOR}${gamepad.index}`;
};

const parseGamepadBindingKey = (key: string): { id: string; index: number } | null => {
  const separatorIndex = key.lastIndexOf(GAMEPAD_KEY_SEPARATOR);
  if (separatorIndex <= 0) return null;

  const id = key.slice(0, separatorIndex);
  const indexPart = key.slice(separatorIndex + GAMEPAD_KEY_SEPARATOR.length);
  const index = Number.parseInt(indexPart, 10);

  if (!Number.isInteger(index)) return null;
  return { id, index };
};

export const mapGamepadValue = (rawValue: number, minValue: number, maxValue: number): number => {
  return normalizeBindValue(rawValue, minValue, maxValue);
};

export const readGamepadInput = (input: GamepadInput | null, gamepad: Gamepad | null): number => {
  if (!input || !gamepad) return 0;

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

  if (config.selectedGamepadId) {
    const selectedBindings = config.gamepad[config.selectedGamepadId];
    if (selectedBindings) {
      return selectedBindings;
    }
  }

  const gamepadKey = toGamepadBindingKey(gamepad);
  const indexedBindings = config.gamepad[gamepadKey];
  if (indexedBindings) {
    return indexedBindings;
  }

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
    return null;
  }

  const parsed = parseGamepadBindingKey(selectedGamepadId);
  if (parsed) {
    return (
      connectedGamepads.find(
        (gamepad) => gamepad.id === parsed.id && gamepad.index === parsed.index,
      ) ?? null
    );
  }

  return connectedGamepads.find((gamepad) => gamepad.id === selectedGamepadId) ?? null;
};
