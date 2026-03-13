import type { Component } from 'solid-js';

import { H3 } from '@manafishrov/ui/typography';

import type { GamepadBindings, GamepadInput } from '@/stores/config';

import { GamepadBindInput } from '@/components/settings/input/GamepadBindInput';

import { BINDING_SECTIONS } from './gamepadSettingsData';

const SettingsGrid: Component<{
  selectedGamepadId: string | null;
  bindings: GamepadBindings;
  resetBindings: GamepadBindings;
  onBindChange: (bindingKey: keyof GamepadBindings, next: GamepadInput | null) => void;
}> = (props) => (
  <div class='grid grid-cols-1 gap-6 sm:grid-cols-2 sm:auto-rows-min'>
    <For each={BINDING_SECTIONS}>
      {(section) => (
        <div class={`space-y-2 ${section.className ?? ''}`.trim()}>
          <H3>{section.title()}</H3>
          <For each={section.fields}>
            {(field) => (
              <GamepadBindInput
                label={field.label()}
                value={props.bindings[field.key]}
                resetValue={props.resetBindings[field.key]}
                selectedGamepadId={props.selectedGamepadId}
                onChange={(next): void => {
                  props.onBindChange(field.key, next);
                }}
              />
            )}
          </For>
        </div>
      )}
    </For>
  </div>
);

export { SettingsGrid };
