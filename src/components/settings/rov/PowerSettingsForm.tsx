import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '@/components/ui/Form';

import { rovConfigStore, setRovConfig } from '@/stores/rovConfig';

const formSchema = z
  .object({
    userMaxPower: z
      .number()
      .min(0, 'Must be at least 0%')
      .max(100, 'Must be at most 100%'),
    regulatorMaxPower: z
      .number()
      .min(0, 'Must be at least 0%')
      .max(100, 'Must be at most 100%'),
    batteryMinVoltage: z.number().min(0, 'Must be a positive voltage'),
    batteryMaxVoltage: z.number().min(0, 'Must be a positive voltage'),
  })
  .refine((data) => data.batteryMinVoltage < data.batteryMaxVoltage, {
    message: 'Min voltage must be less than max voltage',
    path: ['batteryMinVoltage'],
  });

function PowerSettingsForm() {
  const power = useStore(rovConfigStore, (state) => state?.power);

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      userMaxPower: power?.userMaxPower ?? 0,
      regulatorMaxPower: power?.regulatorMaxPower ?? 0,
      batteryMinVoltage: power?.batteryMinVoltage ?? 0,
      batteryMaxVoltage: power?.batteryMaxVoltage ?? 0,
    },
    onSubmit: ({ value }) => setRovConfig({ power: value }),
  });

  useEffect(() => {
    if (power) {
      form.reset({
        userMaxPower: power.userMaxPower,
        regulatorMaxPower: power.regulatorMaxPower,
        batteryMinVoltage: power.batteryMinVoltage,
        batteryMaxVoltage: power.batteryMaxVoltage,
      });
    }
  }, [power, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className='relative space-y-8'
    >
      <form.AppForm>
        <form.AppField name='userMaxPower'>
          {(field) => (
            <field.NumberField
              label='User Maximum Power'
              placeholder='30'
              description='The percentage of power given to the thrusters from user input.'
              fieldSuffix={
                <span className='text-muted-foreground ml-1'>%</span>
              }
            />
          )}
        </form.AppField>
        <form.AppField name='regulatorMaxPower'>
          {(field) => (
            <field.NumberField
              label='Regulator Maximum Power'
              placeholder='30'
              description='The percentage of power given to the thrusters by the regulator to keep the ROV stabilized.'
              fieldSuffix={
                <span className='text-muted-foreground ml-1'>%</span>
              }
            />
          )}
        </form.AppField>
        <form.AppField name='batteryMinVoltage'>
          {(field) => (
            <field.NumberField
              label='Battery Minimum Voltage'
              placeholder='9.6'
              description='The voltage of the battery when it is fully depleeted. This will show as 0% battery in the app. Please include a margin to avoid damaging the battery.'
              fieldSuffix={
                <span className='text-muted-foreground ml-1'>V</span>
              }
            />
          )}
        </form.AppField>
        <form.AppField name='batteryMaxVoltage'>
          {(field) => (
            <field.NumberField
              label='Battery Maximum Voltage'
              placeholder='12.6'
              description='The voltage of the battery when it is fully charged. This will show as 100% battery in the app.'
              fieldSuffix={
                <span className='text-muted-foreground ml-1'>V</span>
              }
            />
          )}
        </form.AppField>
        <form.SubmitButton className='w-28'>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

export { PowerSettingsForm };
