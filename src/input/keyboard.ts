import type { CleanupFn } from '@/input/types';
import type { KeyboardInput } from '@/stores/config';

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

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    pressedKeys.clear();
  };

  return { pressedKeys, cleanup };
};

export const getKeyboardValue = (input: KeyboardInput, pressedKeys: Set<string>): number => {
  const isPressed = pressedKeys.has(input.key);
  return isPressed ? input.maxValue : input.minValue;
};
