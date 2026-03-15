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
    userMaxPowerThrusters: z.array(z.number().min(0).max(MAX_POWER)),
    userMaxPowerActions: z.array(z.number().min(0).max(MAX_POWER)),
    regulatorMaxPower: z.array(z.number().min(0).max(MAX_POWER)),
    batteryMinVoltage: z.number().positive(m.validation_must_be_positive_voltage()),
    batteryMaxVoltage: z.number().positive(m.validation_must_be_positive_voltage()),
  })
  .refine((data) => data.batteryMinVoltage < data.batteryMaxVoltage, {
    message: m.validation_min_voltage_less_than_max(),
    path: ['batteryMinVoltage'],
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
  | 'userMaxPowerThrusters'
  | 'userMaxPowerActions'
  | 'regulatorMaxPower'
  | 'batteryMinVoltage'
  | 'batteryMaxVoltage';

type PowerFieldRenderer = (props: {
  name: PowerFieldName;
  children: (field: PowerFieldApi) => JSXElement;
}) => JSXElement;

const PowerSliderFields: Component<{ AppField: PowerFieldRenderer }> = (props) => (
  <>
    <props.AppField name='userMaxPowerThrusters'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_user_max_power_thrusters_label()}
          description={m.power_user_max_power_description()}
          min={0}
          max={MAX_POWER}
          step={1}
        />
      )}
    </props.AppField>
    <props.AppField name='userMaxPowerActions'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_user_max_power_actions_label()}
          description={m.power_user_max_power_actions_description()}
          min={0}
          max={MAX_POWER}
          step={1}
        />
      )}
    </props.AppField>
    <props.AppField name='regulatorMaxPower'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_regulator_max_power_label()}
          description={m.power_regulator_max_power_description()}
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
    <props.AppField name='batteryMinVoltage'>
      {(field) => (
        <field.NumberInputField
          label={m.power_battery_min_voltage_label()}
          description={m.power_battery_min_voltage_description()}
          min={0}
          step={0.1}
        />
      )}
    </props.AppField>
    <props.AppField name='batteryMaxVoltage'>
      {(field) => (
        <field.NumberInputField
          label={m.power_battery_max_voltage_label()}
          description={m.power_battery_max_voltage_description()}
          min={0}
          step={0.1}
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
  const userMaxPowerThrusters =
    value.userMaxPowerThrusters[0] ?? rovConfigStore.power.userMaxPowerThrusters;
  const userMaxPowerActions =
    value.userMaxPowerActions[0] ?? rovConfigStore.power.userMaxPowerActions;
  const regulatorMaxPower = value.regulatorMaxPower[0] ?? rovConfigStore.power.regulatorMaxPower;
  return setRovConfig({
    power: {
      userMaxPowerThrusters,
      userMaxPowerActions,
      regulatorMaxPower,
      batteryMinVoltage: value.batteryMinVoltage,
      batteryMaxVoltage: value.batteryMaxVoltage,
    },
  });
};

export const Power: Component = () => {
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: {
      userMaxPowerThrusters: [rovConfigStore.power.userMaxPowerThrusters],
      userMaxPowerActions: [rovConfigStore.power.userMaxPowerActions],
      regulatorMaxPower: [rovConfigStore.power.regulatorMaxPower],
      batteryMinVoltage: rovConfigStore.power.batteryMinVoltage,
      batteryMaxVoltage: rovConfigStore.power.batteryMaxVoltage,
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
