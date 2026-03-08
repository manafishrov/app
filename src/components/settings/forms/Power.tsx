import type { Component } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';
import { z } from 'zod';

import { rovConfigStore } from '@/stores/rovConfig';
import { setRovConfig } from '@/tauri';

const POWER_SLIDER_CLASS = `max-w-sm
  [&_[data-slot=slider-track]]:relative
  [&_[data-slot=slider-track]]:bg-gradient-to-r
  [&_[data-slot=slider-track]]:from-green-500
  [&_[data-slot=slider-track]]:via-yellow-500
  [&_[data-slot=slider-track]]:to-red-500
  [&_[data-slot=slider-track]::after]:content-[""]
  [&_[data-slot=slider-track]::after]:absolute
  [&_[data-slot=slider-track]::after]:inset-0
  [&_[data-slot=slider-track]::after]:left-[calc(100%-var(--slider-range-end,0%))]
  [&_[data-slot=slider-track]::after]:bg-muted
  [&_[data-slot=slider-track]::after]:rounded-full
  [&_[data-slot=slider-range]]:bg-transparent`.replace(/\n\s+/g, ' ');

const formSchema = z
  .object({
    userMaxPowerThrusters: z.array(z.number().min(0).max(100)),
    userMaxPowerActions: z.array(z.number().min(0).max(100)),
    regulatorMaxPower: z.array(z.number().min(0).max(100)),
    batteryMinVoltage: z.number().positive('Must be a positive voltage'),
    batteryMaxVoltage: z.number().positive('Must be a positive voltage'),
  })
  .refine((data) => data.batteryMinVoltage < data.batteryMaxVoltage, {
    message: 'Min voltage must be less than max voltage',
    path: ['batteryMinVoltage'],
  });

export const Power: Component = () => {
  const form = useAppForm(() => ({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      userMaxPowerThrusters: [rovConfigStore.power.userMaxPowerThrusters],
      userMaxPowerActions: [rovConfigStore.power.userMaxPowerActions],
      regulatorMaxPower: [rovConfigStore.power.regulatorMaxPower],
      batteryMinVoltage: rovConfigStore.power.batteryMinVoltage,
      batteryMaxVoltage: rovConfigStore.power.batteryMaxVoltage,
    },
    onSubmit: ({ value }) => {
      const userMaxPowerThrusters =
        value.userMaxPowerThrusters[0] ?? rovConfigStore.power.userMaxPowerThrusters;
      const userMaxPowerActions =
        value.userMaxPowerActions[0] ?? rovConfigStore.power.userMaxPowerActions;
      const regulatorMaxPower =
        value.regulatorMaxPower[0] ?? rovConfigStore.power.regulatorMaxPower;

      return setRovConfig({
        power: {
          userMaxPowerThrusters,
          userMaxPowerActions,
          regulatorMaxPower,
          batteryMinVoltage: value.batteryMinVoltage,
          batteryMaxVoltage: value.batteryMaxVoltage,
        },
      });
    },
  }));

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='userMaxPowerThrusters'>
          {(field) => (
            <field.SliderField
              class={POWER_SLIDER_CLASS}
              label='User Maximum Power (Thrusters)'
              description='The percentage of power given to the thrusters from user input.'
              min={0}
              max={100}
              step={1}
            />
          )}
        </form.AppField>
        <form.AppField name='userMaxPowerActions'>
          {(field) => (
            <field.SliderField
              class={POWER_SLIDER_CLASS}
              label='User Maximum Power (Actions)'
              description='The percentage of power given to the motors for actions from user input.'
              min={0}
              max={100}
              step={1}
            />
          )}
        </form.AppField>
        <form.AppField name='regulatorMaxPower'>
          {(field) => (
            <field.SliderField
              class={POWER_SLIDER_CLASS}
              label='Regulator Maximum Power'
              description='The percentage of power given to the thrusters by the regulator to keep the ROV stabilized.'
              min={0}
              max={100}
              step={1}
            />
          )}
        </form.AppField>
        <form.AppField name='batteryMinVoltage'>
          {(field) => (
            <field.NumberInputField
              label='Battery Minimum Voltage'
              description='The voltage of the battery when it is fully depleted. This will show as 0% battery in the app. Please include a margin to avoid damaging the battery.'
              min={0}
              step={0.1}
            />
          )}
        </form.AppField>
        <form.AppField name='batteryMaxVoltage'>
          {(field) => (
            <field.NumberInputField
              label='Battery Maximum Voltage'
              description='The voltage of the battery when it is fully charged. This will show as 100% battery in the app.'
              min={0}
              step={0.1}
            />
          )}
        </form.AppField>
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};
