import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '@/components/ui/Form';

import {
  droneConfigStore,
  movementCoefficientsUpdate,
} from '@/stores/droneConfigStore';

const formSchema = z.object({
  horizontal: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  strafe: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  vertical: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  pitch: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
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
        className='relative grow space-y-8'
      >
        <form.AppForm>
          <div>
            <h4 className='text-lg font-medium'>Horizontal</h4>
            <form.AppField name='horizontal'>
              {(field) => (
                <field.NumberField label='Horizontal' placeholder='0-100' min={0} max={100} />
              )}
            </form.AppField>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Strafe</h4>
            <form.AppField name='strafe'>
              {(field) => (
                <field.NumberField label='Strafe' placeholder='0-100' min={0} max={100} />
              )}
            </form.AppField>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Vertical</h4>
            <form.AppField name='vertical'>
              {(field) => (
                <field.NumberField label='Vertical' placeholder='0-100' min={0} max={100} />
              )}
            </form.AppField>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Pitch</h4>
            <form.AppField name='pitch'>
              {(field) => (
                <field.NumberField label='Pitch' placeholder='0-100' min={0} max={100} />
              )}
            </form.AppField>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Yaw</h4>
            <form.AppField name='yaw'>
              {(field) => (
                <field.NumberField label='Yaw' placeholder='0-100' min={0} max={100} />
              )}
            </form.AppField>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Roll</h4>
            <form.AppField name='roll'>
              {(field) => (
                <field.NumberField label='Roll' placeholder='0-100' min={0} max={100} />
              )}
            </form.AppField>
          </div>
          <form.SubmitButton>Update Movement Coefficients</form.SubmitButton>
        </form.AppForm>
      </form>
    </>
  );
}

export { MovementCoefficientsForm };
