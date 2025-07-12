import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { RegulatorFieldButtons } from '@/components/settings/rov/RegulatorFieldButtons';
import { useAppForm } from '@/components/ui/Form';

import { rovConfigStore, setRovConfig } from '@/stores/rovConfig';

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
  const movementCoefficients = useStore(
    rovConfigStore,
    (state) => state?.movementCoefficients,
  );

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
    onSubmit: ({ value }) => setRovConfig({ movementCoefficients: value }),
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
      <div>
        <h3 className='text-2xl font-semibold tracking-tight'>
          Movement Coefficients
        </h3>
        <p className='text-muted-foreground text-sm'>
          Set the relative power for moving or turning in each direction. The{' '}
          <b>ratios</b> between these values determine how much force each
          thruster will use to move in the expected direction without drifting.
          The units don’t matter as long as all axes use the same units.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className='relative space-y-4'
      >
        <form.AppForm>
          <form.AppField name='horizontal'>
            {(field) => (
              <div className='flex items-center gap-4'>
                <field.NumberField label='Horizontal' />
                <RegulatorFieldButtons
                  defaultValue={0.8}
                  onChange={field.handleChange}
                  label='Horizontal Movement Coefficient'
                />
              </div>
            )}
          </form.AppField>
          <form.AppField name='strafe'>
            {(field) => (
              <div className='flex items-center gap-4'>
                <field.NumberField label='Strafe' />
                <RegulatorFieldButtons
                  defaultValue={0.35}
                  onChange={field.handleChange}
                  label='Strafe Movement Coefficient'
                />
              </div>
            )}
          </form.AppField>
          <form.AppField name='vertical'>
            {(field) => (
              <div className='flex items-center gap-4'>
                <field.NumberField label='Vertical' />
                <RegulatorFieldButtons
                  defaultValue={0.5}
                  onChange={field.handleChange}
                  label='Vertial Movement Coefficient'
                />
              </div>
            )}
          </form.AppField>
          <form.AppField name='pitch'>
            {(field) => (
              <div className='flex items-center gap-4'>
                <field.NumberField label='Pitch' />
                <RegulatorFieldButtons
                  defaultValue={0.4}
                  onChange={field.handleChange}
                  label='Pitch Movement Coefficient'
                />
              </div>
            )}
          </form.AppField>
          <form.AppField name='yaw'>
            {(field) => (
              <div className='flex items-center gap-4'>
                <field.NumberField label='Yaw' />
                <RegulatorFieldButtons
                  defaultValue={0.3}
                  onChange={field.handleChange}
                  label='Yaw Movement Coefficient'
                />
              </div>
            )}
          </form.AppField>
          <form.AppField name='roll'>
            {(field) => (
              <div className='flex items-center gap-4'>
                <field.NumberField label='Roll' />
                <RegulatorFieldButtons
                  defaultValue={0.8}
                  onChange={field.handleChange}
                  label='Roll Movement Coefficient'
                />
              </div>
            )}
          </form.AppField>
          <form.SubmitButton className='w-60'>
            Update Movement Coefficients
          </form.SubmitButton>
        </form.AppForm>
      </form>
    </>
  );
}

export { MovementCoefficientsForm };
