import type { Component } from 'solid-js';

import { SelectItem } from '@manafishrov/ui/select';

import type {
  CameraFieldRenderer,
  NumberFieldConfig,
  SelectFieldConfig,
  SliderFieldConfig,
  SwitchFieldConfig,
} from './fieldTypes';

export const CameraNumberInputField: Component<{
  AppField: CameraFieldRenderer;
  config: NumberFieldConfig;
}> = (props) => (
  <props.AppField name={props.config.name}>
    {(field) => (
      <field.NumberInputField
        label={props.config.label()}
        description={props.config.description()}
        min={props.config.min}
        max={props.config.max}
        step={props.config.step}
        clampValueOnBlur
        trailingAddon={props.config.addon}
      />
    )}
  </props.AppField>
);

export const CameraSelectField: Component<{
  AppField: CameraFieldRenderer;
  config: SelectFieldConfig;
}> = (props) => (
  <props.AppField name={props.config.name}>
    {(field) => (
      <field.SelectField
        label={props.config.label()}
        description={props.config.description()}
        collection={props.config.collection}
        placeholder={props.config.label()}
      >
        <For each={props.config.collection.items}>
          {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

export const CameraSliderField: Component<{
  AppField: CameraFieldRenderer;
  config: SliderFieldConfig;
}> = (props) => (
  <props.AppField name={props.config.name}>
    {(field) => (
      <field.SliderField
        label={props.config.label()}
        description={props.config.description()}
        min={props.config.min}
        max={props.config.max}
        step={props.config.step}
      />
    )}
  </props.AppField>
);

export const CameraSwitchField: Component<{
  AppField: CameraFieldRenderer;
  config: SwitchFieldConfig;
}> = (props) => (
  <props.AppField name={props.config.name}>
    {(field) => (
      <field.SwitchField label={props.config.label()} description={props.config.description()} />
    )}
  </props.AppField>
);
