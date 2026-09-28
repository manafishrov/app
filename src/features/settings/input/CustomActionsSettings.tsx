import type { Component } from 'solid-js';

import { H3, P } from '@manafishrov/ui/typography';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { isCapabilityAvailable } from '@/stores/capabilityAvailability';
import {
  configStore,
  CustomActionTrigger,
  setConfig,
  type CustomActionBinding,
  type GamepadInput,
  type KeyboardInput,
} from '@/stores/config';

import { GamepadBindInput } from './gamepadBindInput';
import { KeyboardBindInput } from './keyboardBindInput';

type CustomActionsSettingsProps =
  | { kind: 'keyboard' }
  | { kind: 'gamepad'; selectedGamepadId: string | null; selectedGamepadConnected: boolean };

type BindableAction = { id: string; name: string; available: boolean };

const availableActions = (): BindableAction[] => {
  const actions = capabilityStore.catalog.actions
    .filter((action) => action.inputType === 'none' && !action.id.startsWith('rov.'))
    .map((action) => ({
      id: action.id,
      name: action.name,
      available: isCapabilityAvailable(action),
    }));
  for (const binding of configStore.customActions) {
    const id = binding.actionId ?? binding.module;
    if (id.length > 0 && !actions.some((action) => action.id === id)) {
      actions.push({ id, name: id, available: false });
    }
  }
  return actions;
};

const getBinding = (id: string): CustomActionBinding =>
  configStore.customActions.find((binding) => (binding.actionId ?? binding.module) === id) ?? {
    id,
    actionId: id,
    module: '',
    trigger: CustomActionTrigger.tap,
    keyboard: null,
    gamepad: {},
  };

const updateBinding = (id: string, patch: Partial<CustomActionBinding>): void => {
  const next = { ...getBinding(id), ...patch };
  const others = configStore.customActions.filter((binding) => binding.id !== next.id);
  setConfig({ customActions: [...others, next] }).catch(logError);
};

const updateGamepad = (id: string, gamepadId: string | null, input: GamepadInput | null): void => {
  if (gamepadId !== null && gamepadId.length > 0) {
    updateBinding(id, { gamepad: { ...getBinding(id).gamepad, [gamepadId]: input } });
  }
};

const BindingInput: Component<{ action: BindableAction; settings: CustomActionsSettingsProps }> = (
  props,
) => (
  <Show
    when={props.settings.kind === 'keyboard'}
    fallback={
      <Show
        when={props.settings.kind === 'gamepad' && props.settings.selectedGamepadConnected}
        fallback={<P>{m.custom_actions_gamepad_not_connected()}</P>}
      >
        <GamepadBindInput
          selectedGamepadId={
            props.settings.kind === 'gamepad' ? props.settings.selectedGamepadId : null
          }
          label={props.action.name}
          value={
            getBinding(props.action.id).gamepad[
              props.settings.kind === 'gamepad' ? (props.settings.selectedGamepadId ?? '') : ''
            ] ?? null
          }
          onChange={(next) => {
            updateGamepad(
              props.action.id,
              props.settings.kind === 'gamepad' ? props.settings.selectedGamepadId : null,
              next,
            );
          }}
        />
      </Show>
    }
  >
    <KeyboardBindInput
      label={props.action.name}
      value={getBinding(props.action.id).keyboard}
      onChange={(keyboard: KeyboardInput | null) => {
        updateBinding(props.action.id, { keyboard });
      }}
    />
  </Show>
);

export const CustomActionsSettings: Component<CustomActionsSettingsProps> = (props) => (
  <section class='mt-8 space-y-4'>
    <H3>{m.capability_bindings()}</H3>
    <P>{m.capability_bindings_description()}</P>
    <Show when={availableActions().length > 0} fallback={<P>{m.capability_bindings_empty()}</P>}>
      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <For each={availableActions()}>
          {(action) => (
            <div class='min-w-0'>
              <BindingInput action={action} settings={props} />
              <Show when={!action.available}>
                <p class='mt-1 text-xs text-muted-foreground'>{m.capability_unavailable()}</p>
              </Show>
            </div>
          )}
        </For>
      </div>
    </Show>
  </section>
);
