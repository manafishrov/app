import { For, createSignal, type Component } from 'solid-js';

import { KeyboardBindInput } from '@/components/settings/KeyboardBindInput';
import { type KeyboardBindings, type KeyboardInput, configStore, setConfig } from '@/stores/config';

type BindingField = {
  key: keyof KeyboardBindings;
  label: string;
};

type BindingSection = {
  title: string;
  fields: BindingField[];
  className?: string;
};

const BINDING_SECTIONS: BindingSection[] = [
  {
    title: 'Surge',
    fields: [
      { key: 'surgeForward', label: 'Surge forward' },
      { key: 'surgeBackward', label: 'Surge backward' },
    ],
  },
  {
    title: 'Sway',
    fields: [
      { key: 'swayRight', label: 'Sway right' },
      { key: 'swayLeft', label: 'Sway left' },
    ],
  },
  {
    title: 'Heave',
    fields: [
      { key: 'heaveUp', label: 'Heave up' },
      { key: 'heaveDown', label: 'Heave down' },
    ],
  },
  {
    title: 'Pitch',
    fields: [
      { key: 'pitchUp', label: 'Pitch up' },
      { key: 'pitchDown', label: 'Pitch down' },
    ],
  },
  {
    title: 'Yaw',
    fields: [
      { key: 'yawRight', label: 'Yaw right' },
      { key: 'yawLeft', label: 'Yaw left' },
    ],
  },
  {
    title: 'Roll',
    fields: [
      { key: 'rollRight', label: 'Roll right' },
      { key: 'rollLeft', label: 'Roll left' },
    ],
  },
  {
    title: 'Actions',
    className: 'sm:row-span-2',
    fields: [
      { key: 'action1Positive', label: 'Action 1 positive' },
      { key: 'action1Negative', label: 'Action 1 negative' },
      { key: 'action2Positive', label: 'Action 2 positive' },
      { key: 'action2Negative', label: 'Action 2 negative' },
    ],
  },
  {
    title: 'Stabilisation',
    fields: [
      { key: 'autoStabilization', label: 'Auto stabilization' },
      { key: 'depthHold', label: 'Depth hold' },
    ],
  },
  {
    title: 'Other',
    fields: [{ key: 'record', label: 'Record' }],
  },
];

const cloneKeyboardBindings = (bindings: KeyboardBindings): KeyboardBindings => {
  return {
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
  };
};

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
            <h3 class='text-2xl font-semibold tracking-tight'>{section.title}</h3>
            <For each={section.fields}>
              {(field) => (
                <KeyboardBindInput
                  label={field.label}
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
