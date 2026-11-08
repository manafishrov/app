import type { Accessor, Component, Setter } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import {
  NumberInput,
  NumberInputControl,
  NumberInputInput,
  NumberInputLabel,
} from '@manafishrov/ui/number-input';

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
    return m.custom_action_scripts_hold();
  }
  return mode === 'toggle' ? m.custom_action_scripts_toggle() : m.custom_action_scripts_once();
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
    const intervalMs = Number(interval());
    if (mode() === action().mode && intervalMs === action().intervalMs) {
      return;
    }
    operation.run(() => {
      if (!Number.isInteger(intervalMs) || intervalMs < MIN_DELAY || intervalMs > MAX_DELAY) {
        return Promise.reject(new Error(m.custom_action_scripts_delay_invalid()));
      }
      return requestCapability('action.configure', { id: action().id, mode: mode(), intervalMs });
    });
  };
  return { mode, setMode, interval, setInterval, operation, save };
};

const RepeatDelay: Component<{ settings: ActionSettingsState }> = (props) => (
  <Show when={props.settings.mode() !== 'once'}>
    <NumberInput
      class='w-36'
      value={props.settings.interval()}
      min={MIN_DELAY}
      max={MAX_DELAY}
      step={1}
      disabled={props.settings.operation.busy()}
      onValueChange={(details) => props.settings.setInterval(details.value)}
    >
      <NumberInputLabel class='sr-only'>{m.custom_action_scripts_delay()}</NumberInputLabel>
      <NumberInputControl>
        <NumberInputInput
          onBlur={props.settings.save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              props.settings.save();
            }
          }}
        />
      </NumberInputControl>
    </NumberInput>
  </Show>
);

export const ActionSettings: Component<{ action: ActionDescriptor; enabled: boolean }> = (
  props,
) => {
  const settings = useActionSettings(() => props.action);
  const running = (): boolean => {
    const sample = capabilityStore.samples[`${props.action.id}.running`];
    return Boolean(sample && sample.value === true);
  };
  return (
    <div class='flex flex-col gap-2 border-t border-border pt-3'>
      <div class='flex flex-wrap items-center gap-3'>
        <span class='mr-auto text-xs font-medium'>{props.action.name}</span>
        <Show when={running()}>
          <Badge variant='outline'>{m.custom_action_scripts_running()}</Badge>
          <Button
            variant='ghost'
            size='sm'
            disabled={!props.enabled || settings.operation.busy()}
            onClick={() => {
              settings.operation.run(() => invokeAction(props.action.id, 'stop'));
            }}
          >
            {m.custom_action_scripts_stop()}
          </Button>
        </Show>
        <div class='w-40'>
          <OptionSelect
            label={m.custom_action_scripts_trigger()}
            hideLabel
            value={settings.mode()}
            disabled={settings.operation.busy()}
            options={props.action.modes.map((mode) => ({ value: mode, label: modeLabel(mode) }))}
            onChange={(mode) => {
              settings.setMode(actionModeSchema.parse(mode));
              settings.save();
            }}
          />
        </div>
        <RepeatDelay settings={settings} />
      </div>
      <OperationFeedback operation={settings.operation} />
    </div>
  );
};
