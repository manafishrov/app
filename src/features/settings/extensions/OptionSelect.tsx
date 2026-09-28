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

export type Option = { value: string; label: string };
export const OptionSelect: Component<{
  label: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  hideLabel?: boolean;
  onChange: (value: string) => void;
}> = (props) => {
  const collection = createMemo(() => createListCollection({ items: props.options }));
  return (
    <Select
      collection={collection()}
      value={[props.value]}
      disabled={props.disabled === true}
      onValueChange={(details) => {
        const [value] = details.value;
        if (typeof value === 'string' && value !== '') {
          props.onChange(value);
        }
      }}
    >
      <SelectLabel class={props.hideLabel === true ? 'sr-only' : ''}>{props.label}</SelectLabel>
      <SelectControl>
        <SelectTrigger>
          <SelectValue placeholder={props.label} />
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
