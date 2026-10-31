import type { Config, CustomActionBinding, GamepadInput, KeyboardInput } from '@/stores/config';

import { readGamepadInput } from '@/input/gamepad';
import { getKeyboardValue } from '@/input/keyboard';
import { logError } from '@/lib/log';
import { capabilityStore } from '@/stores/capabilities';
import { isActionAvailable } from '@/stores/capabilityAvailability';
import { invokeAction } from '@/tauri/capabilities';

type CustomActionRuntimeState = { pressed: boolean; actionId: string; blocked?: boolean };
export type CustomActionToggleState = Map<string, CustomActionRuntimeState>;
type CustomActionToggleArgs = {
  config: Pick<Config, 'customActions' | 'selectedGamepadId'>;
  pressedKeys: Set<string>;
  gamepad: Gamepad | null;
  state: CustomActionToggleState;
};
type InputPair = { keyboard: KeyboardInput | null; gamepad: GamepadInput | null };
const THRESHOLD = 0.5;
const unfocusedStates = new WeakSet<CustomActionToggleState>();

const send = (id: string, phase: 'press' | 'release'): void => {
  invokeAction(id, phase).catch(logError);
};

const getInput = (
  action: CustomActionBinding,
  config: Pick<Config, 'selectedGamepadId'>,
): InputPair => ({
  keyboard: action.keyboard,
  gamepad:
    config.selectedGamepadId !== null && config.selectedGamepadId.length > 0
      ? (action.gamepad[config.selectedGamepadId] ?? null)
      : null,
});

const isInputPressed = (input: InputPair, args: CustomActionToggleArgs): boolean => {
  const keyboard = getKeyboardValue(input.keyboard, args.pressedKeys);
  const gamepad = input.gamepad && args.gamepad ? readGamepadInput(input.gamepad, args.gamepad) : 0;
  return keyboard > THRESHOLD || gamepad > THRESHOLD;
};

const handleAction = (args: CustomActionToggleArgs, binding: CustomActionBinding): void => {
  const id = binding.actionId ?? binding.module;
  const available = isActionAvailable(id);
  const pressed = isInputPressed(getInput(binding, args.config), args);
  const previous = args.state.get(binding.id);
  const blocked = unfocusedStates.has(args.state) || Boolean(previous && previous.blocked);
  // Reconnection must not activate an action whose key was already held.
  if (!blocked && available && pressed !== (previous ? previous.pressed : false)) {
    send(id, pressed ? 'press' : 'release');
  }
  args.state.set(binding.id, { pressed, actionId: id, blocked: blocked && pressed });
};

const removeDeletedActions = (args: CustomActionToggleArgs): void => {
  for (const [id, state] of args.state) {
    if (
      !args.config.customActions.some(
        (binding) => binding.id === id && (binding.actionId ?? binding.module) === state.actionId,
      )
    ) {
      if (state.pressed && capabilityStore.connected) {
        send(state.actionId, 'release');
      }
      args.state.delete(id);
    }
  }
};

export const releaseCustomActions = (states: CustomActionToggleState): void => {
  for (const state of states.values()) {
    if (state.pressed && capabilityStore.connected) {
      send(state.actionId, 'release');
    }
    state.pressed = false;
    state.blocked = true;
  }
};

/** Only input edges cross the wire; action modes and scheduling belong to the ROV. */
export const handleCustomActionToggles = (args: CustomActionToggleArgs): void => {
  removeDeletedActions(args);
  for (const action of args.config.customActions) {
    handleAction(args, action);
  }
};

/** Release immediately: requestAnimationFrame may pause while the window is hidden. */
export const setupCustomActionFocusRelease = (states: CustomActionToggleState): (() => void) => {
  const release = (): void => {
    unfocusedStates.add(states);
    releaseCustomActions(states);
  };
  const focus = (): void => {
    unfocusedStates.delete(states);
  };
  const visibility = (): void => {
    if (document.hidden) {
      release();
    }
  };
  globalThis.addEventListener('focus', focus);
  globalThis.addEventListener('blur', release);
  document.addEventListener('visibilitychange', visibility);
  return (): void => {
    globalThis.removeEventListener('focus', focus);
    globalThis.removeEventListener('blur', release);
    document.removeEventListener('visibilitychange', visibility);
    release();
  };
};
