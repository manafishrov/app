import type { Accessor, Component, Setter } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  TextInput,
  TextInputControl,
  TextInputInput,
  TextInputLabel,
} from '@manafishrov/ui/text-input';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { actionModeSchema, type ActionDescriptor, type ActionMode } from '@/stores/capabilityTypes';
import { invokeAction, requestCapability } from '@/tauri/capabilities';

import { OperationFeedback } from './OperationFeedback';
import { createOperation, type Operation } from './operations';
import { OptionSelect } from './OptionSelect';

const MIN_DELAY = 50;
const MAX_DELAY = 3_600_000;
const modeLabel = (mode: string): string => {
  if (mode === 'hold') {
    return m.extensions_hold();
  }
  return mode === 'toggle' ? m.extensions_toggle() : m.extensions_once();
};

type ActionSettingsState = {
  mode: Accessor<ActionMode>;
  setMode: Setter<ActionMode>;
  interval: Accessor<string>;
  setInterval: Setter<string>;
  operation: Operation;
  save: () => void;
};
const useActionSettings = (action: () => ActionDescriptor): ActionSettingsState => {
  const [mode, setMode] = createSignal(action().mode);
  const [interval, setInterval] = createSignal(String(action().intervalMs));
  const operation = createOperation();
  createEffect(() => {
    setMode(action().mode);
    setInterval(String(action().intervalMs));
  });
  const save = (): void => {
    operation.run(() => {
      const intervalMs = Number(interval());
      if (!Number.isInteger(intervalMs) || intervalMs < MIN_DELAY || intervalMs > MAX_DELAY) {
        return Promise.reject(new Error(m.extensions_delay_invalid()));
      }
      return requestCapability('action.configure', { id: action().id, mode: mode(), intervalMs });
    }, m.extensions_saved());
  };
  return { mode, setMode, interval, setInterval, operation, save };
};

const isActionRunning = (id: string): boolean => {
  const sample = capabilityStore.samples[`${id}.running`];
  return typeof sample === 'object' && sample.value === true;
};
const ActionHeading: Component<{
  action: ActionDescriptor;
  enabled: boolean;
  settings: ActionSettingsState;
}> = (props) => (
  <div class='flex items-center justify-between gap-2'>
    <div class='flex flex-wrap items-center gap-2'>
      <p class='text-sm font-medium'>{props.action.name}</p>
      <Show when={isActionRunning(props.action.id)}>
        <span role='status' class='text-xs text-primary'>
          {m.extensions_running()}
        </span>
      </Show>
    </div>
    <Show when={props.settings.mode() !== 'once'}>
      <Button
        variant='ghost'
        size='sm'
        disabled={!props.enabled || props.settings.operation.busy()}
        onClick={() => {
          props.settings.operation.run(() => invokeAction(props.action.id, 'stop'));
        }}
      >
        {m.extensions_stop()}
      </Button>
    </Show>
  </div>
);

export const ActionSettings: Component<{ action: ActionDescriptor; enabled: boolean }> = (
  props,
) => {
  const settings = useActionSettings(() => props.action);
  return (
    <div class='flex flex-col gap-2 border-t border-border pt-3'>
      <ActionHeading action={props.action} enabled={props.enabled} settings={settings} />
      <div class='grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]'>
        <OptionSelect
          label={m.extensions_trigger()}
          value={settings.mode()}
          disabled={settings.operation.busy()}
          options={props.action.modes.map((mode) => ({ value: mode, label: modeLabel(mode) }))}
          onChange={(mode) => settings.setMode(actionModeSchema.parse(mode))}
        />
        <TextInput disabled={settings.mode() === 'once' || settings.operation.busy()}>
          <TextInputLabel>{m.extensions_delay()}</TextInputLabel>
          <TextInputControl>
            <TextInputInput
              type='number'
              min={MIN_DELAY}
              max={MAX_DELAY}
              step={1}
              value={settings.interval()}
              onInput={(event) => settings.setInterval(event.currentTarget.value)}
            />
          </TextInputControl>
        </TextInput>
        <Button variant='outline' disabled={settings.operation.busy()} onClick={settings.save}>
          {m.extensions_save()}
        </Button>
      </div>
      <OperationFeedback operation={settings.operation} />
    </div>
  );
};
