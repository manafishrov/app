import type { Component } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';
import { z } from 'zod';

import { rovConfigStore } from '@/stores/rovConfig';
import { setRovConfig } from '@/tauri';

const formSchema = z
  .object({
    userMaxPower: z.array(z.number().min(0).max(100)),
    regulatorMaxPower: z.array(z.number().min(0).max(100)),
    batteryMinVoltage: z.number().min(0, 'Must be a positive voltage'),
    batteryMaxVoltage: z.number().min(0, 'Must be a positive voltage'),
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
      userMaxPower: [rovConfigStore.power.userMaxPower],
      regulatorMaxPower: [rovConfigStore.power.regulatorMaxPower],
      batteryMinVoltage: rovConfigStore.power.batteryMinVoltage,
      batteryMaxVoltage: rovConfigStore.power.batteryMaxVoltage,
    },
    onSubmit: ({ value }) => {
      const userMaxPower = value.userMaxPower[0] ?? rovConfigStore.power.userMaxPower;
      const regulatorMaxPower =
        value.regulatorMaxPower[0] ?? rovConfigStore.power.regulatorMaxPower;

      return setRovConfig({
        power: {
          userMaxPower,
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
        <form.AppField name='userMaxPower'>
          {(field) => (
            <field.SliderField
              class='max-w-sm'
              label='User Maximum Power'
              description='The percentage of power given to the thrusters from user input.'
              min={0}
              max={100}
              step={1}
            />
          )}
        </form.AppField>
        <form.AppField name='regulatorMaxPower'>
          {(field) => (
            <field.SliderField
              class='max-w-sm'
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
        <form.AutoSubmit debounce={300} />
      </form.Form>
    </form.AppForm>
  );
};
