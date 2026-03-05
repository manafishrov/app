import { For, type Component } from 'solid-js';

import { KeyboardBindInput } from '@/components/settings/KeyboardBindInput';
import {
  type KeyboardBindings,
  type KeyboardInput,
  configStore,
  defaultKeyboardBindings,
  setConfig,
} from '@/stores/config';

type BindingField = {
  key: keyof KeyboardBindings;
  label: string;
};

type BindingSection = {
  title: string;
  fields: BindingField[];
};

const LEFT_COLUMN: BindingSection[] = [
  {
    title: 'Surge & Sway',
    fields: [
      { key: 'surgeForward', label: 'Surge forward' },
      { key: 'swayLeft', label: 'Sway left' },
      { key: 'surgeBackward', label: 'Surge backward' },
      { key: 'swayRight', label: 'Sway right' },
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
    title: 'Stabilization',
    fields: [
      { key: 'autoStabilization', label: 'Auto stabilization' },
      { key: 'depthHold', label: 'Depth hold' },
    ],
  },
];

const RIGHT_COLUMN: BindingSection[] = [
  {
    title: 'Pitch & Yaw',
    fields: [
      { key: 'pitchUp', label: 'Pitch up' },
      { key: 'yawLeft', label: 'Yaw left' },
      { key: 'pitchDown', label: 'Pitch down' },
      { key: 'yawRight', label: 'Yaw right' },
    ],
  },
  {
    title: 'Roll',
    fields: [
      { key: 'rollLeft', label: 'Roll left' },
      { key: 'rollRight', label: 'Roll right' },
    ],
  },
  {
    title: 'Actions',
    fields: [
      { key: 'action1Positive', label: 'Action 1 positive' },
      { key: 'action1Negative', label: 'Action 1 negative' },
      { key: 'action2Positive', label: 'Action 2 positive' },
      { key: 'action2Negative', label: 'Action 2 negative' },
      { key: 'record', label: 'Record' },
    ],
  },
];

const updateKeyboardBinding = async (bindingKey: keyof KeyboardBindings, value: KeyboardInput) => {
  const updatedBindings: KeyboardBindings = {
    ...configStore.keyboard,
    [bindingKey]: value,
  };

  await setConfig({ keyboard: updatedBindings });
};

const SettingsColumn: Component<{ sections: BindingSection[] }> = (props) => {
  return (
    <div class='space-y-6'>
      <For each={props.sections}>
        {(section) => (
          <div class='space-y-2'>
            <h3 class='text-2xl font-semibold tracking-tight'>{section.title}</h3>
            <For each={section.fields}>
              {(field) => (
                <KeyboardBindInput
                  label={field.label}
                  value={configStore.keyboard[field.key]}
                  defaultValue={defaultKeyboardBindings[field.key]}
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

const KeyboardSettings: Component = () => {
  return (
    <div class='grid grid-cols-1 gap-x-8 sm:grid-cols-2'>
      <SettingsColumn sections={LEFT_COLUMN} />
      <SettingsColumn sections={RIGHT_COLUMN} />
    </div>
  );
};

export { KeyboardSettings };
