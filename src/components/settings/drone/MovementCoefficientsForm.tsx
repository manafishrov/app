import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '@/components/ui/Form';

import {
  droneConfigStore,
  movementCoefficientsUpdate,
} from '@/stores/droneConfigStore';

const formSchema = z.object({
  horizontal: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  strafe: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  vertical: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  pitch: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  yaw: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  roll: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
});

function MovementCoefficientsForm() {
  const { movementCoefficients } = useStore(droneConfigStore);

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      horizontal: movementCoefficients?.horizontal ?? 0,
      strafe: movementCoefficients?.strafe ?? 0,
      vertical: movementCoefficients?.vertical ?? 0,
      pitch: movementCoefficients?.pitch ?? 0,
      yaw: movementCoefficients?.yaw ?? 0,
      roll: movementCoefficients?.roll ?? 0,
    },
    onSubmit: ({ value }) => movementCoefficientsUpdate(value),
  });

  useEffect(() => {
    if (movementCoefficients) {
      form.reset({
        horizontal: movementCoefficients.horizontal,
        strafe: movementCoefficients.strafe,
        vertical: movementCoefficients.vertical,
        pitch: movementCoefficients.pitch,
        yaw: movementCoefficients.yaw,
        roll: movementCoefficients.roll,
      });
    }
  }, [movementCoefficients, form]);

  return (
    <>
      <h3 className='text-2xl font-semibold tracking-tight'>
        Movement Coefficients
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className='relative space-y-4'
      >
        <form.AppForm>
          <form.AppField name='horizontal'>
            {(field) => <field.NumberField label='Horizontal' />}
          </form.AppField>
          <form.AppField name='strafe'>
            {(field) => <field.NumberField label='Strafe' />}
          </form.AppField>
          <form.AppField name='vertical'>
            {(field) => <field.NumberField label='Vertical' />}
          </form.AppField>
          <form.AppField name='pitch'>
            {(field) => <field.NumberField label='Pitch' />}
          </form.AppField>
          <form.AppField name='yaw'>
            {(field) => <field.NumberField label='Yaw' />}
          </form.AppField>
          <form.AppField name='roll'>
            {(field) => <field.NumberField label='Roll' />}
          </form.AppField>
          <form.SubmitButton>Update Movement Coefficients</form.SubmitButton>
        </form.AppForm>
      </form>
    </>
  );
}

export { MovementCoefficientsForm };
