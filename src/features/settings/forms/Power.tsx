import type { Component, JSXElement } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';
import { z } from 'zod';

import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { setRovConfig } from '@/tauri';

const MAX_POWER = 100;
const SLIDER_CLASS =
  'max-w-sm **:data-[slot=slider-track]:relative **:data-[slot=slider-track]:bg-linear-to-r **:data-[slot=slider-track]:from-green-500 **:data-[slot=slider-track]:via-yellow-500 **:data-[slot=slider-track]:to-red-500 [&_[data-slot=slider-track]::after]:content-[""] [&_[data-slot=slider-track]::after]:absolute [&_[data-slot=slider-track]::after]:inset-0 [&_[data-slot=slider-track]::after]:left-[calc(100%-var(--slider-range-end,0%))] [&_[data-slot=slider-track]::after]:bg-muted [&_[data-slot=slider-track]::after]:rounded-full **:data-[slot=slider-range]:bg-transparent [&_[data-scope=slider][data-part=value-text]::after]:content-["%"]';

const formSchema = z
  .object({
    thrustersLimit: z.array(z.number().min(0).max(MAX_POWER)),
    actionsLimit: z.array(z.number().min(0).max(MAX_POWER)),
    regulatorLimit: z.array(z.number().min(0).max(MAX_POWER)),
    minBatteryVoltage: z.number().positive(m.validation_must_be_positive_voltage()),
    maxBatteryVoltage: z.number().positive(m.validation_must_be_positive_voltage()),
    internalResistance: z.number().min(0),
  })
  .refine((data) => data.minBatteryVoltage < data.maxBatteryVoltage, {
    message: m.validation_min_voltage_less_than_max(),
    path: ['minBatteryVoltage'],
  });

type PowerFieldApi = {
  SliderField: (props: {
    class?: string;
    label: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => JSXElement;
  NumberInputField: (props: {
    label: string;
    description?: string;
    min?: number;
    step?: number;
  }) => JSXElement;
};

type PowerFieldName =
  | 'thrustersLimit'
  | 'actionsLimit'
  | 'regulatorLimit'
  | 'minBatteryVoltage'
  | 'maxBatteryVoltage'
  | 'internalResistance';

type PowerFieldRenderer = (props: {
  name: PowerFieldName;
  children: (field: PowerFieldApi) => JSXElement;
}) => JSXElement;

const PowerSliderFields: Component<{ AppField: PowerFieldRenderer }> = (props) => (
  <>
    <props.AppField name='thrustersLimit'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_thrusters_limit_label()}
          description={m.power_thrusters_limit_description()}
          min={0}
          max={MAX_POWER}
          step={1}
        />
      )}
    </props.AppField>
    <props.AppField name='actionsLimit'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_actions_limit_label()}
          description={m.power_actions_limit_description()}
          min={0}
          max={MAX_POWER}
          step={1}
        />
      )}
    </props.AppField>
    <props.AppField name='regulatorLimit'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_regulator_limit_label()}
          description={m.power_regulator_limit_description()}
          min={0}
          max={MAX_POWER}
          step={1}
        />
      )}
    </props.AppField>
  </>
);

const PowerVoltageFields: Component<{ AppField: PowerFieldRenderer }> = (props) => (
  <>
    <props.AppField name='minBatteryVoltage'>
      {(field) => (
        <field.NumberInputField
          label={m.power_min_battery_voltage_label()}
          description={m.power_min_battery_voltage_description()}
          min={0}
          step={0.1}
        />
      )}
    </props.AppField>
    <props.AppField name='maxBatteryVoltage'>
      {(field) => (
        <field.NumberInputField
          label={m.power_max_battery_voltage_label()}
          description={m.power_max_battery_voltage_description()}
          min={0}
          step={0.1}
        />
      )}
    </props.AppField>
    <props.AppField name='internalResistance'>
      {(field) => (
        <field.NumberInputField
          label={m.power_internal_resistance_label()}
          description={m.power_internal_resistance_description()}
          min={0}
          step={0.001}
        />
      )}
    </props.AppField>
  </>
);

const PowerFields: Component<{ AppField: PowerFieldRenderer }> = (props) => (
  <>
    <PowerSliderFields AppField={props.AppField} />
    <PowerVoltageFields AppField={props.AppField} />
  </>
);

const submitPowerSettings = (value: z.infer<typeof formSchema>): Promise<void> => {
  const thrustersLimit = value.thrustersLimit[0] ?? rovConfigStore.power.thrustersLimit;
  const actionsLimit = value.actionsLimit[0] ?? rovConfigStore.power.actionsLimit;
  const regulatorLimit = value.regulatorLimit[0] ?? rovConfigStore.power.regulatorLimit;
  return setRovConfig({
    power: {
      thrustersLimit,
      actionsLimit,
      regulatorLimit,
      minBatteryVoltage: value.minBatteryVoltage,
      maxBatteryVoltage: value.maxBatteryVoltage,
      internalResistance: value.internalResistance,
    },
  });
};

export const Power: Component = () => {
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: {
      thrustersLimit: [rovConfigStore.power.thrustersLimit],
      actionsLimit: [rovConfigStore.power.actionsLimit],
      regulatorLimit: [rovConfigStore.power.regulatorLimit],
      minBatteryVoltage: rovConfigStore.power.minBatteryVoltage,
      maxBatteryVoltage: rovConfigStore.power.maxBatteryVoltage,
      internalResistance: rovConfigStore.power.internalResistance,
    },
    onSubmit: ({ value }): Promise<void> => submitPowerSettings(value),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <PowerFields AppField={form.AppField} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};
