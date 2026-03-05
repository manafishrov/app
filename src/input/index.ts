export { type CleanupFn } from '@/input/types';

export { computeDirectionVector, createDirectionVectorLoop } from '@/input/directionVector';

export {
  getActiveGamepad,
  getConnectedGamepads,
  getGamepadBindings,
  mapGamepadValue,
  readGamepadInput,
} from '@/input/gamepad';

export {
  BIND_CAPTURE_SETTLE_MS,
  BIND_CAPTURE_TIMEOUT_MS,
  GAMEPAD_CAPTURE_THRESHOLD,
  formatGamepadInputLabel,
  formatKeyboardKeyLabel,
  getGamepadRawInputValue,
  isKeyboardKey,
  normalizeBindValue,
  roundToBindIncrement,
} from '@/input/bindings';

export { createKeyboardTracker, getKeyboardValue } from '@/input/keyboard';
export { createStateToggleLoop } from '@/input/stateToggles';
