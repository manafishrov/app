import type { GamepadBindings, GamepadInput } from '@/stores/config';

import * as m from '@/paraglide/messages';

type SelectItemOption = {
  value: string;
  label: string;
};

type BindingField = {
  key: keyof GamepadBindings;
  label: () => string;
};

type BindingSection = {
  title: () => string;
  fields: BindingField[];
  class?: string;
};

const BINDING_SECTIONS: BindingSection[] = [
  {
    title: () => m.bindings_section_surge(),
    fields: [
      { key: 'surgeForward', label: () => m.keyboard_surge_forward() },
      { key: 'surgeBackward', label: () => m.keyboard_surge_backward() },
    ],
  },
  {
    title: () => m.bindings_section_sway(),
    fields: [
      { key: 'swayRight', label: () => m.keyboard_sway_right() },
      { key: 'swayLeft', label: () => m.keyboard_sway_left() },
    ],
  },
  {
    title: () => m.gamepad_heave(),
    fields: [
      { key: 'heaveUp', label: () => m.gamepad_heave_up() },
      { key: 'heaveDown', label: () => m.gamepad_heave_down() },
    ],
  },
  {
    title: () => m.bindings_section_pitch(),
    fields: [
      { key: 'pitchUp', label: () => m.keyboard_pitch_up() },
      { key: 'pitchDown', label: () => m.keyboard_pitch_down() },
    ],
  },
  {
    title: () => m.bindings_section_yaw(),
    fields: [
      { key: 'yawRight', label: () => m.keyboard_yaw_right() },
      { key: 'yawLeft', label: () => m.keyboard_yaw_left() },
    ],
  },
  {
    title: () => m.gamepad_roll(),
    fields: [
      { key: 'rollRight', label: () => m.gamepad_roll_right() },
      { key: 'rollLeft', label: () => m.gamepad_roll_left() },
    ],
  },
  {
    title: () => m.gamepad_actions(),
    class: 'sm:row-span-2',
    fields: [
      { key: 'action1Positive', label: () => m.gamepad_action_1_positive() },
      { key: 'action1Negative', label: () => m.gamepad_action_1_negative() },
      { key: 'action2Positive', label: () => m.gamepad_action_2_positive() },
      { key: 'action2Negative', label: () => m.gamepad_action_2_negative() },
    ],
  },
  {
    title: () => m.bindings_section_stabilization(),
    fields: [
      { key: 'autoStabilization', label: () => m.bindings_action_auto_stabilization() },
      { key: 'depthHold', label: () => m.gamepad_depth_hold() },
      { key: 'desiredDepthEntry', label: () => m.gamepad_desired_depth_entry() },
      { key: 'desiredDepthIncrease', label: () => m.gamepad_desired_depth_increase() },
      { key: 'desiredDepthDecrease', label: () => m.gamepad_desired_depth_decrease() },
    ],
  },
  {
    title: () => m.bindings_section_other(),
    fields: [{ key: 'record', label: () => m.gamepad_record() }],
  },
];

const POLL_INTERVAL_MS = 500;

const createNullValue = (): null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null from regex mismatch');
  }
  return result;
};

const NULL_VALUE = createNullValue();

const ignoreSetConfigResult = (): void => {
  Number.isNaN(Number.NaN);
};

const hasSelectedGamepadId = (gamepadId: string | null): gamepadId is string =>
  gamepadId !== NULL_VALUE && gamepadId.length > 0;

const hasValueArray = (details: unknown): details is { value: readonly unknown[] } =>
  details instanceof Object && 'value' in details && Array.isArray(details.value);

const getSelectedGamepadIdFromDetails = (details: unknown): string | null => {
  if (!hasValueArray(details) || details.value.length === 0) {
    return NULL_VALUE;
  }

  const [firstValue] = details.value;
  return typeof firstValue === 'string' ? firstValue : NULL_VALUE;
};

const cloneBinding = (binding: GamepadInput | null): GamepadInput | null =>
  binding ? { ...binding, input: { ...binding.input } } : NULL_VALUE;

const cloneGamepadBindings = (bindings: GamepadBindings): GamepadBindings => ({
  surgeForward: cloneBinding(bindings.surgeForward),
  surgeBackward: cloneBinding(bindings.surgeBackward),
  swayRight: cloneBinding(bindings.swayRight),
  swayLeft: cloneBinding(bindings.swayLeft),
  heaveUp: cloneBinding(bindings.heaveUp),
  heaveDown: cloneBinding(bindings.heaveDown),
  pitchUp: cloneBinding(bindings.pitchUp),
  pitchDown: cloneBinding(bindings.pitchDown),
  yawRight: cloneBinding(bindings.yawRight),
  yawLeft: cloneBinding(bindings.yawLeft),
  rollLeft: cloneBinding(bindings.rollLeft),
  rollRight: cloneBinding(bindings.rollRight),
  action1Positive: cloneBinding(bindings.action1Positive),
  action1Negative: cloneBinding(bindings.action1Negative),
  action2Positive: cloneBinding(bindings.action2Positive),
  action2Negative: cloneBinding(bindings.action2Negative),
  autoStabilization: cloneBinding(bindings.autoStabilization),
  depthHold: cloneBinding(bindings.depthHold),
  desiredDepthEntry: cloneBinding(bindings.desiredDepthEntry),
  desiredDepthIncrease: cloneBinding(bindings.desiredDepthIncrease),
  desiredDepthDecrease: cloneBinding(bindings.desiredDepthDecrease),
  record: cloneBinding(bindings.record),
});

const cloneGamepadMap = (map: Record<string, GamepadBindings>): Record<string, GamepadBindings> => {
  const clonedMap: Record<string, GamepadBindings> = {};
  for (const [id, bindings] of Object.entries(map)) {
    clonedMap[id] = cloneGamepadBindings(bindings);
  }
  return clonedMap;
};

const toGamepadOptions = (gamepads: Gamepad[]): SelectItemOption[] => {
  const totalsById = new Map<string, number>();
  const seenById = new Map<string, number>();

  for (const gamepad of gamepads) {
    totalsById.set(gamepad.id, (totalsById.get(gamepad.id) ?? 0) + 1);
  }

  return gamepads.map((gamepad) => {
    const count = (seenById.get(gamepad.id) ?? 0) + 1;
    seenById.set(gamepad.id, count);
    const total = totalsById.get(gamepad.id) ?? 1;

    return {
      value: gamepad.id,
      label: total > 1 ? m.gamepad_duplicate_label({ id: gamepad.id, count }) : gamepad.id,
    };
  });
};

export {
  BINDING_SECTIONS,
  NULL_VALUE,
  POLL_INTERVAL_MS,
  cloneGamepadMap,
  getSelectedGamepadIdFromDetails,
  hasSelectedGamepadId,
  ignoreSetConfigResult,
  toGamepadOptions,
};
export type { BindingSection, SelectItemOption };
