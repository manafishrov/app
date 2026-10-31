import type { Component, JSXElement } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import {
  Select,
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import {
  TextInput,
  TextInputControl,
  TextInputDescription,
  TextInputInput,
  TextInputLabel,
} from '@manafishrov/ui/text-input';
import { H3, P } from '@manafishrov/ui/typography';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
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

const MODULE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const createActionId = (): string => globalThis.crypto.randomUUID();

const hasGamepadId = (gamepadId: string | null): gamepadId is string =>
  typeof gamepadId === 'string' && gamepadId.length > 0;

const createCustomAction = (): CustomActionBinding => ({
  id: createActionId(),
  module: '',
  trigger: CustomActionTrigger.tap,
  keyboard: null,
  gamepad: {},
});

const saveActions = (actions: CustomActionBinding[]): void => {
  setConfig({ customActions: actions }).catch(logError);
};

const updateAction = (
  actionId: string,
  updater: (action: CustomActionBinding) => CustomActionBinding,
): void => {
  saveActions(
    configStore.customActions.map((action) => (action.id === actionId ? updater(action) : action)),
  );
};

const addAction = (): void => {
  saveActions([...configStore.customActions, createCustomAction()]);
};

const removeAction = (actionId: string): void => {
  saveActions(configStore.customActions.filter((action) => action.id !== actionId));
};

const updateModule = (actionId: string, moduleName: string): void => {
  updateAction(actionId, (action) => ({ ...action, module: moduleName }));
};

const updateTrigger = (actionId: string, trigger: CustomActionTrigger): void => {
  updateAction(actionId, (action) => ({ ...action, trigger }));
};

const toTrigger = (value: string): CustomActionTrigger =>
  value === CustomActionTrigger.hold ? CustomActionTrigger.hold : CustomActionTrigger.tap;

const updateKeyboard = (actionId: string, keyboard: KeyboardInput | null): void => {
  updateAction(actionId, (action) => ({ ...action, keyboard }));
};

const updateGamepad = (
  actionId: string,
  gamepadId: string | null,
  input: GamepadInput | null,
): void => {
  if (!hasGamepadId(gamepadId)) {
    return;
  }
  updateAction(actionId, (action) => ({
    ...action,
    gamepad: { ...action.gamepad, [gamepadId]: input },
  }));
};

const getGamepadInput = (
  action: CustomActionBinding,
  gamepadId: string | null,
): GamepadInput | null => {
  if (!hasGamepadId(gamepadId)) {
    return null;
  }
  return action.gamepad[gamepadId] ?? null;
};

const getModuleHint = (moduleName: string): JSXElement => {
  const trimmed = moduleName.trim();
  if (trimmed.length === 0) {
    return m.custom_actions_module_hint_disabled();
  }
  return MODULE_NAME_PATTERN.test(trimmed) ? (
    <>
      {m.custom_actions_module_hint_valid_prefix()} <code>rov_firmware/custom_actions/</code>.
    </>
  ) : (
    <>
      {m.custom_actions_module_hint_invalid_prefix()} <code>example_action</code>.
    </>
  );
};

const BindingInput: Component<{
  action: CustomActionBinding;
  settings: CustomActionsSettingsProps;
}> = (props) => (
  <Show
    when={props.settings.kind === 'keyboard'}
    fallback={
      <Show
        when={props.settings.kind === 'gamepad' && props.settings.selectedGamepadConnected}
        fallback={<P>{m.custom_actions_gamepad_not_connected()}</P>}
      >
        <GamepadBindInput
          selectedGamepadId={
            props.settings.kind === 'gamepad' ? props.settings.selectedGamepadId : ''
          }
          label={m.custom_actions_gamepad_binding()}
          value={getGamepadInput(
            props.action,
            props.settings.kind === 'gamepad' ? props.settings.selectedGamepadId : null,
          )}
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
      label={m.custom_actions_keyboard_binding()}
      value={props.action.keyboard}
      onChange={(next) => {
        updateKeyboard(props.action.id, next);
      }}
    />
  </Show>
);

type TriggerOption = { value: CustomActionTrigger; label: string };

const createTriggerOptions = (): ReturnType<typeof createListCollection<TriggerOption>> =>
  createListCollection<TriggerOption>({
    items: [
      { value: CustomActionTrigger.tap, label: m.custom_actions_trigger_tap() },
      { value: CustomActionTrigger.hold, label: m.custom_actions_trigger_hold() },
    ],
  });

const ModuleInput: Component<{ action: CustomActionBinding }> = (props) => (
  <TextInput>
    <TextInputLabel>{m.custom_actions_python_module()}</TextInputLabel>
    <TextInputControl>
      <TextInputInput
        value={props.action.module}
        placeholder={m.custom_actions_module_placeholder()}
        onInput={(event) => {
          updateModule(props.action.id, event.currentTarget.value);
        }}
      />
    </TextInputControl>
    <TextInputDescription class='text-[0.8rem]'>
      {getModuleHint(props.action.module)}
    </TextInputDescription>
  </TextInput>
);

const TriggerSelect: Component<{ action: CustomActionBinding }> = (props) => {
  const triggerOptions = createTriggerOptions();
  return (
    <div class='flex flex-col gap-1.5'>
      <Select
        collection={triggerOptions}
        value={[props.action.trigger]}
        onValueChange={(details) => {
          const [firstValue] = details.value;
          if (typeof firstValue === 'string') {
            updateTrigger(props.action.id, toTrigger(firstValue));
          }
        }}
      >
        <SelectLabel>{m.custom_actions_trigger_label()}</SelectLabel>
        <SelectControl>
          <SelectTrigger>
            <SelectValue placeholder={m.custom_actions_trigger_placeholder()} />
            <SelectIndicator />
          </SelectTrigger>
        </SelectControl>
        <SelectPositioner>
          <SelectContent>
            <For each={triggerOptions.items}>
              {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
            </For>
          </SelectContent>
        </SelectPositioner>
      </Select>
      <span class='text-[0.8rem] text-muted-foreground'>
        {m.custom_actions_trigger_hold_description()}
      </span>
    </div>
  );
};

const CustomActionRow: Component<{
  action: CustomActionBinding;
  settings: CustomActionsSettingsProps;
}> = (props) => (
  <div class='rounded-lg border bg-background/80 p-4'>
    <div class='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_13rem_auto]'>
      <ModuleInput action={props.action} />
      <TriggerSelect action={props.action} />
      <Button
        class='self-start lg:mt-6'
        variant='outline'
        onClick={() => {
          removeAction(props.action.id);
        }}
      >
        {m.custom_actions_remove()}
      </Button>
    </div>
    <div class='mt-4'>
      <BindingInput action={props.action} settings={props.settings} />
    </div>
  </div>
);

const CustomActionsSettings: Component<CustomActionsSettingsProps> = (props) => (
  <section class='mt-8 space-y-4 rounded-xl border bg-card/60 p-5 shadow-sm'>
    <div class='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
      <div class='space-y-1'>
        <H3>{m.custom_actions_title()}</H3>
        <P>
          {m.custom_actions_description_bindings()} <code>rov_firmware/custom_actions/</code>.{' '}
          {m.custom_actions_description_optional()} <code>ssh pi@10.10.10.10</code>{' '}
          {m.custom_actions_description_password()} <code>manafish</code>.
        </P>
      </div>
      <Button onClick={addAction}>{m.custom_actions_add_action()}</Button>
    </div>
    <Show when={configStore.customActions.length > 0} fallback={<P>{m.custom_actions_empty()}</P>}>
      <div class='space-y-4'>
        <For each={configStore.customActions}>
          {(action) => <CustomActionRow action={action} settings={props} />}
        </For>
      </div>
    </Show>
  </section>
);

export { CustomActionsSettings };
