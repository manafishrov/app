import { readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';
import {
  CustomActionTrigger,
  type Config,
  type CustomActionBinding,
  type GamepadInput,
  type KeyboardInput,
} from '@/stores/config';
import { sendCustomAction } from '@/tauri/customAction';

type CustomActionRuntimeState = {
  pressed: boolean;
  lastFiredAt: number;
};

export type CustomActionToggleState = Map<string, CustomActionRuntimeState>;

type CustomActionToggleArgs = {
  config: Config;
  pressedKeys: Set<string>;
  gamepad: Gamepad | null;
  state: CustomActionToggleState;
};

type InputPair = { keyboard: KeyboardInput | null; gamepad: GamepadInput | null };

const THRESHOLD = 0.5;
const HOLD_REPEAT_INTERVAL_MS = 250;
const MODULE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const createNullValue = (): null => {
  const result = /a/u.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null match result');
  }
  return result;
};

const executeActionSilently = (action: () => Promise<void>): void => {
  action().catch(() => {
    // Intentionally silent - prevents unhandled promise rejection
  });
};

const getGamepadInput = (
  action: CustomActionBinding,
  selectedGamepadId: string | null,
): GamepadInput | null => {
  if (typeof selectedGamepadId !== 'string' || selectedGamepadId.length === 0) {
    return createNullValue();
  }
  return action.gamepad[selectedGamepadId] ?? createNullValue();
};

const getInput = (action: CustomActionBinding, config: Config): InputPair => ({
  keyboard: action.keyboard,
  gamepad: getGamepadInput(action, config.selectedGamepadId),
});

const isInputPressed = (
  input: InputPair,
  pressedKeys: Set<string>,
  gamepad: Gamepad | null,
): boolean => {
  const kbValue = getKeyboardValue(input.keyboard, pressedKeys);
  const gpValue = input.gamepad && gamepad ? readGamepadInput(input.gamepad, gamepad) : 0;
  return kbValue > THRESHOLD || gpValue > THRESHOLD;
};

const getActionState = (
  states: CustomActionToggleState,
  action: CustomActionBinding,
): CustomActionRuntimeState => {
  const existing = states.get(action.id);
  if (existing) {
    return existing;
  }
  const next = { pressed: false, lastFiredAt: 0 };
  states.set(action.id, next);
  return next;
};

const getEnabledModuleName = (moduleName: string): string | null => {
  const trimmed = moduleName.trim();
  return MODULE_NAME_PATTERN.test(trimmed) ? trimmed : createNullValue();
};

const shouldFire = (
  action: CustomActionBinding,
  actionState: CustomActionRuntimeState,
  now: number,
): boolean => {
  if (action.trigger === CustomActionTrigger.tap) {
    return !actionState.pressed;
  }
  return !actionState.pressed || now - actionState.lastFiredAt >= HOLD_REPEAT_INTERVAL_MS;
};

const fireCustomAction = (moduleName: string, actionState: CustomActionRuntimeState): void => {
  executeActionSilently(() => sendCustomAction(moduleName));
  actionState.lastFiredAt = performance.now();
};

const handleCustomActionToggle = (
  args: CustomActionToggleArgs,
  action: CustomActionBinding,
): void => {
  const moduleName = getEnabledModuleName(action.module);
  const actionState = getActionState(args.state, action);
  if (moduleName === null) {
    actionState.pressed = false;
    return;
  }

  const pressed = isInputPressed(getInput(action, args.config), args.pressedKeys, args.gamepad);
  if (pressed && shouldFire(action, actionState, performance.now())) {
    fireCustomAction(moduleName, actionState);
  }
  actionState.pressed = pressed;
};

const removeDeletedActions = (
  actions: readonly CustomActionBinding[],
  states: CustomActionToggleState,
): void => {
  const activeIds = new Set(actions.map((action) => action.id));
  for (const id of states.keys()) {
    if (!activeIds.has(id)) {
      states.delete(id);
    }
  }
};

export const handleCustomActionToggles = (args: CustomActionToggleArgs): void => {
  removeDeletedActions(args.config.customActions, args.state);
  for (const action of args.config.customActions) {
    handleCustomActionToggle(args, action);
  }
};
