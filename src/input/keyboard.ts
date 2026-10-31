import type { CleanupFn } from '@/input/types';
import type { KeyboardInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

export const createKeyboardTracker = (): {
  pressedKeys: Set<string>;
  cleanup: CleanupFn;
} => {
  const pressedKeys = new Set<string>();

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat || pressedKeys.has(event.code)) {
      pressedKeys.add(event.code);
    }
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.code);
  };

  const handleVisibilityChange = (event: Event): void => {
    if (document.hidden || event.type === 'blur') {
      pressedKeys.clear();
    }
  };

  globalThis.addEventListener('blur', handleVisibilityChange);
  globalThis.addEventListener('keydown', handleKeyDown);
  globalThis.addEventListener('keyup', handleKeyUp);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const cleanup = (): void => {
    globalThis.removeEventListener('blur', handleVisibilityChange);
    globalThis.removeEventListener('keydown', handleKeyDown);
    globalThis.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    pressedKeys.clear();
  };

  return { pressedKeys, cleanup };
};

export const getKeyboardValue = (input: KeyboardInput | null, pressedKeys: Set<string>): number => {
  if (!input) {
    return 0;
  }

  const rawValue = pressedKeys.has(input.key) ? 1 : 0;
  return normalizeBindValue(rawValue, input.minValue, input.maxValue);
};
