import type { Component } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
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
  TextInputInput,
  TextInputLabel,
} from '@manafishrov/ui/text-input';

import type { OverlayWidget, OverlayWidgetOptions } from '@/stores/overlayTypes';

import {
  readingDisplays,
  type CapabilityDisplay,
} from '@/features/overlay/widgets/capabilityDisplay';
import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

const labels: Record<CapabilityDisplay, () => string> = {
  text: () => m.capability_text(),
  badge: () => m.capability_badge(),
  status: () => m.capability_status(),
  warningYellow: () => m.capability_warning_yellow(),
  warningRed: () => m.capability_warning_red(),
  ping: () => m.capability_ping(),
  bar: () => m.capability_bar(),
  verticalBar: () => m.capability_vertical_bar(),
  button: () => m.capability_button(),
};
type Props = { widget: OverlayWidget; onChange: (options: OverlayWidgetOptions) => void };

const DisplaySelect: Component<Props> = (props) => {
  const options = (): readonly CapabilityDisplay[] => {
    const reading = capabilityStore.catalog.readings.find(
      (entry) => entry.id === props.widget.options.sourceId,
    );
    if (reading) {
      return readingDisplays(reading.valueType);
    }
    const stored = props.widget.options.display;
    return stored && Object.hasOwn(labels, stored) ? [stored] : ['text'];
  };
  const collection = (): ReturnType<
    typeof createListCollection<{ value: CapabilityDisplay; label: string }>
  > =>
    createListCollection({ items: options().map((value) => ({ value, label: labels[value]() })) });
  return (
    <Select
      collection={collection()}
      value={[options().find((value) => value === props.widget.options.display) ?? 'text']}
      onValueChange={(details) => {
        const value = options().find((candidate) => candidate === details.value[0]);
        if (value) {
          props.onChange({ ...props.widget.options, display: value });
        }
      }}
    >
      <SelectLabel>{m.capability_display()}</SelectLabel>
      <SelectControl>
        <SelectTrigger>
          <SelectValue />
          <SelectIndicator />
        </SelectTrigger>
      </SelectControl>
      <SelectPositioner>
        <SelectContent>
          <For each={collection().items}>
            {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
          </For>
        </SelectContent>
      </SelectPositioner>
    </Select>
  );
};

const NumericOption: Component<
  Props & { field: 'minimum' | 'maximum' | 'decaySeconds'; label: string; fallback: number }
> = (props) => (
  <TextInput>
    <TextInputLabel>{props.label}</TextInputLabel>
    <TextInputControl>
      <TextInputInput
        type='number'
        step='any'
        value={props.widget.options[props.field] ?? props.fallback}
        onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value) && (props.field !== 'decaySeconds' || value > 0)) {
            props.onChange({ ...props.widget.options, [props.field]: value });
          }
        }}
      />
    </TextInputControl>
  </TextInput>
);

export const CapabilityOptions: Component<Props> = (props) => (
  <div class='grid w-full grid-cols-1 gap-3 sm:grid-cols-2'>
    <TextInput>
      <TextInputLabel>{m.capability_label()}</TextInputLabel>
      <TextInputControl>
        <TextInputInput
          value={props.widget.options.label ?? ''}
          onChange={(event) => {
            props.onChange({ ...props.widget.options, label: event.currentTarget.value });
          }}
        />
      </TextInputControl>
    </TextInput>
    <Show when={props.widget.options.sourceKind !== 'action'}>
      <DisplaySelect {...props} />
    </Show>
    <Show when={['bar', 'verticalBar', 'status'].includes(props.widget.options.display ?? '')}>
      <NumericOption {...props} field='minimum' label={m.capability_minimum()} fallback={0} />
      <NumericOption {...props} field='maximum' label={m.capability_maximum()} fallback={1} />
    </Show>
    <Show when={props.widget.options.display === 'ping'}>
      <NumericOption {...props} field='decaySeconds' label={m.capability_decay()} fallback={0.5} />
    </Show>
    <p class='truncate text-xs text-muted-foreground sm:col-span-2'>
      {m.capability_source()}: {props.widget.options.sourceId}
    </p>
  </div>
);
