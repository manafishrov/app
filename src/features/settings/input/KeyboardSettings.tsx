import type { Component } from 'solid-js';

import { H3 } from '@manafishrov/ui/typography';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { type KeyboardBindings, type KeyboardInput, configStore, setConfig } from '@/stores/config';
import { vibrateConfirm } from '@/tauri/gamepad';

import { KeyboardBindInput } from './keyboardBindInput';

type BindingField = {
  key: keyof KeyboardBindings;
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
    title: () => m.keyboard_heave(),
    fields: [
      { key: 'heaveUp', label: () => m.keyboard_heave_up() },
      { key: 'heaveDown', label: () => m.keyboard_heave_down() },
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
    title: () => m.keyboard_roll(),
    fields: [
      { key: 'rollRight', label: () => m.keyboard_roll_right() },
      { key: 'rollLeft', label: () => m.keyboard_roll_left() },
    ],
  },
  {
    title: () => m.keyboard_actions(),
    class: 'sm:row-span-2',
    fields: [
      { key: 'action1Positive', label: () => m.keyboard_action_1_positive() },
      { key: 'action1Negative', label: () => m.keyboard_action_1_negative() },
      { key: 'action2Positive', label: () => m.keyboard_action_2_positive() },
      { key: 'action2Negative', label: () => m.keyboard_action_2_negative() },
    ],
  },
  {
    title: () => m.bindings_section_stabilization(),
    fields: [
      { key: 'autoStabilization', label: () => m.bindings_action_auto_stabilization() },
      { key: 'depthHold', label: () => m.keyboard_depth_hold() },
      { key: 'desiredDepthEntry', label: () => m.keyboard_desired_depth_entry() },
      { key: 'desiredDepthIncrease', label: () => m.keyboard_desired_depth_increase() },
      { key: 'desiredDepthDecrease', label: () => m.keyboard_desired_depth_decrease() },
    ],
  },
  {
    title: () => m.bindings_section_other(),
    fields: [{ key: 'record', label: () => m.keyboard_record() }],
  },
];

const updateKeyboardBinding = (
  bindingKey: keyof KeyboardBindings,
  value: KeyboardInput | null,
): void => {
  const updatedBindings: KeyboardBindings = {
    ...configStore.keyboard,
    [bindingKey]: value,
  };

  setConfig({ keyboard: updatedBindings })
    .then(() => {
      vibrateConfirm(configStore.selectedGamepadId);
    })
    .catch(logError);
};

const KeyboardSettings: Component = () => (
  <div class='grid grid-cols-1 gap-6 sm:auto-rows-min sm:grid-cols-2'>
    <For each={BINDING_SECTIONS}>
      {(section) => (
        <div class={`space-y-2 ${section.class ?? ''}`.trim()}>
          <H3>{section.title()}</H3>
          <For each={section.fields}>
            {(field) => (
              <KeyboardBindInput
                label={field.label()}
                value={configStore.keyboard[field.key]}
                onChange={(next) => {
                  updateKeyboardBinding(field.key, next);
                }}
              />
            )}
          </For>
        </div>
      )}
    </For>
  </div>
);

export { KeyboardSettings };
