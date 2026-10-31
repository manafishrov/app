import type { CleanupFn } from '@/input/types';
import type { KeyboardInput } from '@/stores/config';

import { normalizeBindValue } from '@/input/bindings';

export const createKeyboardTracker = (): {
  pressedKeys: Set<string>;
  cleanup: CleanupFn;
} => {
  const pressedKeys = new Set<string>();

  const handleKeyDown = (event: KeyboardEvent): void => {
    pressedKeys.add(event.code);
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.code);
  };

  const handleVisibilityChange = (): void => {
    if (document.hidden) {
      pressedKeys.clear();
    }
  };

  globalThis.addEventListener('keydown', handleKeyDown);
  globalThis.addEventListener('keyup', handleKeyUp);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const cleanup = (): void => {
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
