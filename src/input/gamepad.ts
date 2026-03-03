import type { Config, GamepadBindings, GamepadInput } from '@/stores/config';

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const mapGamepadValue = (rawValue: number, minValue: number, maxValue: number): number => {
  const range = maxValue - minValue;
  if (range === 0) return 0;
  return clamp((rawValue - minValue) / range, 0, 1);
};

export const readGamepadInput = (input: GamepadInput, gamepad: Gamepad | null): number => {
  if (!gamepad) return 0;

  if ('Button' in input.input) {
    const idx = input.input.Button[0];
    const raw = gamepad.buttons[idx]?.value ?? 0;
    return mapGamepadValue(raw, input.minValue, input.maxValue);
  }

  if ('Axis' in input.input) {
    const idx = input.input.Axis[0];
    const raw = gamepad.axes[idx] ?? 0;
    return mapGamepadValue(raw, input.minValue, input.maxValue);
  }

  return 0;
};

export const getGamepadBindings = (
  gamepad: Gamepad | null,
  config: Config,
): GamepadBindings | null => {
  if (!gamepad || !config.gamepad) return null;

  const exact = config.gamepad[gamepad.id];
  if (exact) return exact;

  const firstKey = Object.keys(config.gamepad)[0];
  return firstKey ? (config.gamepad[firstKey] ?? null) : null;
};

export const getActiveGamepad = (): Gamepad | null => {
  return navigator.getGamepads?.()?.[0] ?? null;
};
