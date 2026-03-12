import { H3 } from '@manafishrov/ui/typography';
import { type Component } from 'solid-js';

import { KeyboardBindInput } from '@/components/settings/input/KeyboardBindInput';
import * as m from '@/paraglide/messages';
import { type KeyboardBindings, type KeyboardInput, configStore, setConfig } from '@/stores/config';

type BindingField = {
  key: keyof KeyboardBindings;
  label: () => string;
};

type BindingSection = {
  title: () => string;
  fields: BindingField[];
  className?: string;
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
    className: 'sm:row-span-2',
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
    ],
  },
  {
    title: () => m.bindings_section_other(),
    fields: [{ key: 'record', label: () => m.keyboard_record() }],
  },
];

const cloneKeyboardBindings = (bindings: KeyboardBindings): KeyboardBindings => ({
  surgeForward: bindings.surgeForward ? { ...bindings.surgeForward } : null,
  surgeBackward: bindings.surgeBackward ? { ...bindings.surgeBackward } : null,
  swayRight: bindings.swayRight ? { ...bindings.swayRight } : null,
  swayLeft: bindings.swayLeft ? { ...bindings.swayLeft } : null,
  heaveUp: bindings.heaveUp ? { ...bindings.heaveUp } : null,
  heaveDown: bindings.heaveDown ? { ...bindings.heaveDown } : null,
  pitchUp: bindings.pitchUp ? { ...bindings.pitchUp } : null,
  pitchDown: bindings.pitchDown ? { ...bindings.pitchDown } : null,
  yawRight: bindings.yawRight ? { ...bindings.yawRight } : null,
  yawLeft: bindings.yawLeft ? { ...bindings.yawLeft } : null,
  rollLeft: bindings.rollLeft ? { ...bindings.rollLeft } : null,
  rollRight: bindings.rollRight ? { ...bindings.rollRight } : null,
  action1Positive: bindings.action1Positive ? { ...bindings.action1Positive } : null,
  action1Negative: bindings.action1Negative ? { ...bindings.action1Negative } : null,
  action2Positive: bindings.action2Positive ? { ...bindings.action2Positive } : null,
  action2Negative: bindings.action2Negative ? { ...bindings.action2Negative } : null,
  autoStabilization: bindings.autoStabilization ? { ...bindings.autoStabilization } : null,
  depthHold: bindings.depthHold ? { ...bindings.depthHold } : null,
  record: bindings.record ? { ...bindings.record } : null,
});

const updateKeyboardBinding = async (
  bindingKey: keyof KeyboardBindings,
  value: KeyboardInput | null,
) => {
  const updatedBindings: KeyboardBindings = {
    ...configStore.keyboard,
    [bindingKey]: value,
  };

  await setConfig({ keyboard: updatedBindings });
};

const KeyboardSettings: Component = () => {
  const [initialBindings] = createSignal<KeyboardBindings>(
    cloneKeyboardBindings(configStore.keyboard),
  );

  return (
    <div class='grid grid-cols-1 gap-6 sm:grid-cols-2 sm:auto-rows-min'>
      <For each={BINDING_SECTIONS}>
        {(section) => (
          <div class={`space-y-2 ${section.className ?? ''}`.trim()}>
            <H3>{section.title()}</H3>
            <For each={section.fields}>
              {(field) => (
                <KeyboardBindInput
                  label={field.label()}
                  value={configStore.keyboard[field.key]}
                  resetValue={initialBindings()[field.key]}
                  onChange={(next) => updateKeyboardBinding(field.key, next)}
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

export { KeyboardSettings };
